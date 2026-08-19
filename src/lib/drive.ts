import { google } from 'googleapis';
import { Readable } from 'node:stream';

export class DriveNotConfiguredError extends Error {
  constructor() {
    super(
      'Google Drive servis hesabı yapılandırılmamış. .env dosyasında GOOGLE_SERVICE_ACCOUNT_EMAIL, ' +
        'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ve GOOGLE_DRIVE_FOLDER_ID değerlerini ayarlayın.',
    );
    this.name = 'DriveNotConfiguredError';
  }
}

export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_DRIVE_FOLDER_ID,
  );
}

function getDriveClient() {
  if (!isDriveConfigured()) throw new DriveNotConfiguredError();
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

export async function uploadCertificate(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: input.fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID as string],
    },
    media: {
      mimeType: input.mimeType,
      body: Readable.from(input.buffer),
    },
    fields: 'id, webViewLink',
  });
  const fileId = res.data.id;
  const webViewLink = res.data.webViewLink;
  if (!fileId || !webViewLink) {
    throw new Error('Google Drive dosya yükleme yanıtı eksik.');
  }
  return { fileId, webViewLink };
}

export async function deleteCertificate(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

/** Yüklenecek bir sertifika/belge dosyası için ortak boyut sınırı. */
export const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB

function isNotFoundError(err: unknown): boolean {
  const code = (err as { code?: number } | null)?.code;
  return code === 404;
}

/** Bir Drive dosyasını siler; dosya zaten mevcut değilse (404) bunu
 * başarı sayar. Başka bir sebeple (izin, ağ, oran sınırı) başarısız
 * olursa hatayı YUTMAZ — çağıran, veritabanı referansını ancak silme
 * gerçekten başarılı olduğunda temizlemeli, aksi halde Drive'da hâlâ
 * duran ama hiçbir yerden erişilemeyen "yetim" dosyalar birikir. */
export async function deleteCertificateIfExists(
  fileId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!fileId) return { ok: true };
  try {
    await deleteCertificate(fileId);
    return { ok: true };
  } catch (err) {
    if (isNotFoundError(err)) return { ok: true };
    return {
      ok: false,
      error: `Belge Drive'dan silinemedi: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
    };
  }
}

/** Bir sertifika/belgeyi değiştirir: önce yeni dosyayı yükler, sadece
 * yükleme başarılı olduktan SONRA eski dosyayı (varsa) en iyi çaba ile
 * siler. Bu sıralama kasıtlı — önce eski dosyayı silip sonra yükleme
 * başarısız olursa, veritabanı artık var olmayan bir dosyaya işaret
 * eden "ölü" bir referansta kalırdı. Eski dosyanın silinmesi burada
 * best-effort'tur çünkü yeni dosya zaten başarıyla yüklenip tek gerçek
 * referans haline geldi; eski dosyanın silinememesi çağıranın asıl
 * işlemini bozmamalı. */
export async function replaceCertificate(input: {
  existingFileId: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; webViewLink: string }> {
  const uploaded = await uploadCertificate({
    fileName: input.fileName,
    mimeType: input.mimeType,
    buffer: input.buffer,
  });
  if (input.existingFileId) {
    await deleteCertificate(input.existingFileId).catch(() => {});
  }
  return uploaded;
}

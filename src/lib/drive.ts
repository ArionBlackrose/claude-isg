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

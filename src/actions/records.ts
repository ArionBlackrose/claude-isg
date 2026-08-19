'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { requireAdmin, requireInternalSession } from '@/lib/session';
import { normName } from '@/lib/excel';
import { logActivity, diffSummary } from '@/lib/audit';
import { recordSchema, recordUpdateSchema, recordsBatchSchema } from '@/schemas/record';
import {
  deleteCertificateIfExists,
  DriveNotConfiguredError,
  MAX_CERTIFICATE_SIZE,
  replaceCertificate,
} from '@/lib/drive';
import type { ActionResult } from './training';

function revalidateRecordPaths() {
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  revalidatePath('/katalog');
  revalidatePath('/personel');
}

async function recordLabel(personnelId: string, trainingId: string): Promise<string> {
  const [[person], [egitim]] = await Promise.all([
    db.select().from(personnel).where(eq(personnel.id, personnelId)),
    db.select().from(training).where(eq(training.id, trainingId)),
  ]);
  const personLabel = person ? `${person.ad} ${person.soyad}` : 'bilinmeyen personel';
  const trainingLabel = egitim ? egitim.ad : 'bilinmeyen eğitim';
  return `${personLabel} — ${trainingLabel}`;
}

export async function createRecord(input: unknown): Promise<ActionResult> {
  const session = await requireInternalSession();
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const [selectedTraining] = await db
    .select()
    .from(training)
    .where(eq(training.id, parsed.data.trainingId));
  if (selectedTraining?.kategori === 'Uyarı') {
    return {
      ok: false,
      error: 'Uyarı eğitimi kayıtları sadece Uyarı Eğitimleri panelinden eklenebilir.',
    };
  }
  const [inserted] = await db
    .insert(trainingRecord)
    .values({
      personnelId: parsed.data.personnelId,
      trainingId: parsed.data.trainingId,
      tarih: parsed.data.tarih,
      sonuc: parsed.data.sonuc,
      dosyaNo: parsed.data.dosyaNo || null,
      not: parsed.data.not || null,
      createdByUserId: session.user.id,
    })
    .returning();
  revalidateRecordPaths();
  const label = await recordLabel(parsed.data.personnelId, parsed.data.trainingId);
  await logActivity(
    session,
    'create',
    'kayit',
    inserted.id,
    label,
    `Eğitim kaydı eklendi: ${parsed.data.tarih} — ${parsed.data.sonuc}.`,
  );
  return { ok: true };
}

export type RecordsBatchResult = { ok: true; created: number } | { ok: false; error: string };

/** `createRecords`/`createUyariRecords` arasında paylaşılan asıl toplu ekleme
 * mantığı. `kategoriGuard` seçilen eğitimlerden hangisinin bu action için
 * yasak olduğunu belirler — normal panelde Uyarı eğitimleri, Uyarı
 * panelinde Uyarı DIŞI eğitimler reddedilir; böylece "Uyarı eğitimi
 * girişleri sadece Uyarı Eğitimleri panelinden yapılabilir" kuralı, hangi
 * arayüzden çağrıldığından bağımsız olarak sunucu tarafında uygulanır. */
async function createRecordsInternal(
  input: unknown,
  kategoriGuard: (kategori: string) => string | null,
): Promise<RecordsBatchResult> {
  const session = await requireInternalSession();
  const parsed = recordsBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const { tarih, sonuc, dosyaNo, not } = parsed.data;
  const personnelIds = Array.from(new Set(parsed.data.personnelIds));
  const trainingIds = Array.from(new Set(parsed.data.trainingIds));

  const [personRows, trainingRows] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training),
  ]);
  const personById = new Map(personRows.map((p) => [p.id, `${p.ad} ${p.soyad}`]));
  const trainingById = new Map(trainingRows.map((t) => [t.id, t]));

  for (const trainingId of trainingIds) {
    const t = trainingById.get(trainingId);
    if (!t) continue;
    const error = kategoriGuard(t.kategori);
    if (error) {
      return { ok: false, error: `"${t.ad}" eğitimi: ${error}` };
    }
  }

  // better-sqlite3 sürücüsü senkron çalıştığı için db.transaction() içindeki
  // callback async OLAMAZ; bu yüzden insert'ler .get() ile senkron olarak
  // yapılır, tüm kombinasyonlar ya birlikte yazılır ya da hiçbiri yazılmaz.
  const inserted: { id: string; personnelId: string; trainingId: string }[] = [];
  try {
    db.transaction((tx) => {
      for (const personnelId of personnelIds) {
        for (const trainingId of trainingIds) {
          const row = tx
            .insert(trainingRecord)
            .values({
              personnelId,
              trainingId,
              tarih,
              sonuc,
              dosyaNo: dosyaNo || null,
              not: not || null,
              createdByUserId: session.user.id,
            })
            .returning()
            .get();
          inserted.push({ id: row.id, personnelId, trainingId });
        }
      }
    });
  } catch {
    return { ok: false, error: 'Kayıtlar oluşturulamadı. Hiçbir kayıt eklenmedi.' };
  }

  for (const row of inserted) {
    const label = `${personById.get(row.personnelId) ?? 'bilinmeyen personel'} — ${trainingById.get(row.trainingId)?.ad ?? 'bilinmeyen eğitim'}`;
    await logActivity(
      session,
      'create',
      'kayit',
      row.id,
      label,
      `Eğitim kaydı eklendi: ${tarih} — ${sonuc}.`,
    );
  }

  revalidateRecordPaths();
  return { ok: true, created: inserted.length };
}

/** Secilen her personel x egitim kombinasyonu icin ayri bir kayit olusturur
 * (bir kisiye birden fazla egitim, ya da bir egitimi birden fazla kisiye
 * tek seferde eklemek icin). Uyarı kategorisindeki eğitimler bu action ile
 * eklenemez — onlar için `createUyariRecords` kullanılır. */
export async function createRecords(input: unknown): Promise<RecordsBatchResult> {
  return createRecordsInternal(input, (kategori) =>
    kategori === 'Uyarı'
      ? 'Uyarı eğitimi kayıtları sadece Uyarı Eğitimleri panelinden eklenebilir.'
      : null,
  );
}

/** Uyarı Eğitimleri panelinden çağrılır — sadece kategorisi "Uyarı" olan
 * eğitimler için kayıt eklenmesine izin verir. */
export async function createUyariRecords(input: unknown): Promise<RecordsBatchResult> {
  return createRecordsInternal(input, (kategori) =>
    kategori !== 'Uyarı'
      ? 'Uyarı kategorisinde değil; bu panelden sadece Uyarı eğitimleri eklenebilir.'
      : null,
  );
}

export async function updateRecord(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireInternalSession();
  const parsed = recordUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const [existing] = await db.select().from(trainingRecord).where(eq(trainingRecord.id, id));
  if (!existing) {
    return { ok: false, error: 'Kayıt bulunamadı.' };
  }
  await db
    .update(trainingRecord)
    .set({
      tarih: parsed.data.tarih,
      sonuc: parsed.data.sonuc,
      dosyaNo: parsed.data.dosyaNo || null,
      not: parsed.data.not || null,
    })
    .where(eq(trainingRecord.id, id));
  revalidateRecordPaths();
  const label = await recordLabel(existing.personnelId, existing.trainingId);
  const summary = diffSummary(
    existing,
    {
      tarih: parsed.data.tarih,
      sonuc: parsed.data.sonuc,
      dosyaNo: parsed.data.dosyaNo || null,
      not: parsed.data.not || null,
    },
    { tarih: 'Tarih', sonuc: 'Sonuç', dosyaNo: 'Dosya No', not: 'Not' },
  );
  await logActivity(session, 'update', 'kayit', id, label, summary);
  return { ok: true };
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const [existing] = await db.select().from(trainingRecord).where(eq(trainingRecord.id, id));
  if (existing?.driveFileId) {
    await deleteCertificateIfExists(existing.driveFileId);
  }
  await db.delete(trainingRecord).where(eq(trainingRecord.id, id));
  revalidateRecordPaths();
  if (existing) {
    const label = await recordLabel(existing.personnelId, existing.trainingId);
    await logActivity(
      session,
      'delete',
      'kayit',
      id,
      label,
      `Eğitim kaydı silindi: ${existing.tarih} — ${existing.sonuc}.`,
    );
  }
  return { ok: true };
}

export async function uploadRecordCertificate(
  recordId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireInternalSession();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Dosya bulunamadı.' };
  }
  if (file.size > MAX_CERTIFICATE_SIZE) {
    return { ok: false, error: 'Dosya boyutu 10 MB sınırını aşıyor.' };
  }

  const [existing] = await db.select().from(trainingRecord).where(eq(trainingRecord.id, recordId));
  if (!existing) {
    return { ok: false, error: 'Kayıt bulunamadı.' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileId, webViewLink } = await replaceCertificate({
      existingFileId: existing.driveFileId,
      fileName: `${recordId}-${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });
    await db
      .update(trainingRecord)
      .set({ driveFileId: fileId, driveWebViewLink: webViewLink })
      .where(eq(trainingRecord.id, recordId));
  } catch (err) {
    if (err instanceof DriveNotConfiguredError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: `Sertifika yüklenemedi: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
    };
  }

  revalidateRecordPaths();
  const label = await recordLabel(existing.personnelId, existing.trainingId);
  await logActivity(session, 'update', 'kayit', recordId, label, 'Sertifika yüklendi.');
  return { ok: true };
}

export type RecordExcelRawRow = Record<string, string>;

export type RecordImportSkip = { row: number; reason: string };

export type RecordImportResult =
  | { ok: true; imported: number; egitimCreated: number; skipped: RecordImportSkip[] }
  | { ok: false; error: string };

const VALID_SONUC = new Set(['Başarılı', 'Başarısız', 'Katılmadı']);

export async function importRecordsFromExcel(
  rows: RecordExcelRawRow[],
): Promise<RecordImportResult> {
  const session = await requireInternalSession();

  if (!Array.isArray(rows) || !rows.length) {
    return { ok: false, error: 'Excel dosyasında satır bulunamadı.' };
  }

  const [allPersonnel, allTrainings] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training),
  ]);
  const personnelByTc = new Map(
    allPersonnel.filter((p) => p.tcNo).map((p) => [p.tcNo as string, p]),
  );
  const personnelByName = new Map(allPersonnel.map((p) => [normName(`${p.ad} ${p.soyad}`), p]));
  const trainingByName = new Map(allTrainings.map((t) => [normName(t.ad), t]));

  const skipped: RecordImportSkip[] = [];
  const toInsert: (typeof trainingRecord.$inferInsert)[] = [];
  let egitimCreated = 0;

  for (const [index, row] of rows.entries()) {
    const rowNo = index + 2; // 1. satır başlık
    const tcNo = (row['TC KİMLİK NO'] ?? '').trim();
    const adSoyad = (row['AD SOYAD'] ?? '').trim();
    const egitimAdi = (row['EĞİTİM ADI'] ?? '').trim();
    const tarih = (row['TARİH'] ?? '').trim();
    const sonucRaw = (row['SONUÇ'] ?? '').trim();
    const dosyaNo = (row['DOSYA NO'] ?? '').trim();
    const not = (row['NOT'] ?? '').trim();

    if (!egitimAdi || !tarih) {
      skipped.push({ row: rowNo, reason: 'Eğitim adı veya tarih eksik.' });
      continue;
    }

    const person = (tcNo && personnelByTc.get(tcNo)) || personnelByName.get(normName(adSoyad));
    if (!person) {
      skipped.push({ row: rowNo, reason: `Personel bulunamadı (${tcNo || adSoyad || '?'}).` });
      continue;
    }

    // Personel TC/ad-soyad ile bulunduysa ve eğitim kataloğunda yoksa,
    // eğitimi otomatik oluşturup kaydı bu personele ekliyoruz.
    let trainingMatch = trainingByName.get(normName(egitimAdi));
    if (!trainingMatch) {
      const [insertedTraining] = await db
        .insert(training)
        .values({ ad: egitimAdi, kategori: 'Genel', gecerlilikAy: 0 })
        .returning();
      trainingMatch = insertedTraining;
      trainingByName.set(normName(egitimAdi), insertedTraining);
      egitimCreated++;
    }

    if (trainingMatch.kategori === 'Uyarı') {
      skipped.push({
        row: rowNo,
        reason: `"${trainingMatch.ad}" bir Uyarı eğitimi — Excel içe aktarma ile eklenemez, Uyarı Eğitimleri panelini kullanın.`,
      });
      continue;
    }

    let sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
    if (!sonucRaw) {
      // SONUÇ sütunu boş bırakılan satırlar kasıtlı olarak "Başarılı" kabul
      // edilir (eski Excel şablonlarında bu sütun hiç yoktu); geçersiz bir
      // değer girildiyse (aşağıdaki else dalı) satır atlanır.
      sonuc = 'Başarılı';
    } else if (VALID_SONUC.has(sonucRaw)) {
      sonuc = sonucRaw as 'Başarılı' | 'Başarısız' | 'Katılmadı';
    } else {
      skipped.push({ row: rowNo, reason: `Geçersiz sonuç değeri: "${sonucRaw}".` });
      continue;
    }

    toInsert.push({
      personnelId: person.id,
      trainingId: trainingMatch.id,
      tarih,
      sonuc,
      dosyaNo: dosyaNo || null,
      not: not || null,
      createdByUserId: session.user.id,
    });
  }

  if (toInsert.length) {
    for (const record of toInsert) {
      await db.insert(trainingRecord).values(record);
    }
  }

  revalidateRecordPaths();

  await logActivity(
    session,
    'create',
    'kayit',
    null,
    'Excel İçe Aktarma',
    `${toInsert.length} kayıt eklendi, ${egitimCreated} yeni eğitim türü oluşturuldu, ${skipped.length} satır atlandı.`,
  );

  return { ok: true, imported: toInsert.length, egitimCreated, skipped };
}

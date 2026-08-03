'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { normName } from '@/lib/excel';
import { recordSchema, recordUpdateSchema } from '@/schemas/record';
import { deleteCertificate, DriveNotConfiguredError, uploadCertificate } from '@/lib/drive';
import type { ActionResult } from './training';

function revalidateRecordPaths() {
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  revalidatePath('/katalog');
}

export async function createRecord(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  await db.insert(trainingRecord).values({
    personnelId: parsed.data.personnelId,
    trainingId: parsed.data.trainingId,
    tarih: parsed.data.tarih,
    sonuc: parsed.data.sonuc,
    not: parsed.data.not || null,
    createdByUserId: session.user.id,
  });
  revalidateRecordPaths();
  return { ok: true };
}

export async function updateRecord(id: string, input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = recordUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  await db
    .update(trainingRecord)
    .set({
      tarih: parsed.data.tarih,
      sonuc: parsed.data.sonuc,
      not: parsed.data.not || null,
    })
    .where(eq(trainingRecord.id, id));
  revalidateRecordPaths();
  return { ok: true };
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  await requireSession();
  const [existing] = await db.select().from(trainingRecord).where(eq(trainingRecord.id, id));
  if (existing?.driveFileId) {
    await deleteCertificate(existing.driveFileId).catch(() => {});
  }
  await db.delete(trainingRecord).where(eq(trainingRecord.id, id));
  revalidateRecordPaths();
  return { ok: true };
}

const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadRecordCertificate(
  recordId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireSession();
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
    if (existing.driveFileId) {
      await deleteCertificate(existing.driveFileId).catch(() => {});
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileId, webViewLink } = await uploadCertificate({
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
  const session = await requireSession();

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

    const sonuc = VALID_SONUC.has(sonucRaw)
      ? (sonucRaw as 'Başarılı' | 'Başarısız' | 'Katılmadı')
      : 'Başarılı';

    toInsert.push({
      personnelId: person.id,
      trainingId: trainingMatch.id,
      tarih,
      sonuc,
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
  return { ok: true, imported: toInsert.length, egitimCreated, skipped };
}

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { requireAdmin, requireSession } from '@/lib/session';
import { normName } from '@/lib/excel';
import { logActivity, diffSummary } from '@/lib/audit';
import { recordSchema, recordUpdateSchema, recordsBatchSchema } from '@/schemas/record';
import { deleteCertificate, DriveNotConfiguredError, uploadCertificate } from '@/lib/drive';
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
  const session = await requireSession();
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
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

/** Secilen her personel x egitim kombinasyonu icin ayri bir kayit olusturur
 * (bir kisiye birden fazla egitim, ya da bir egitimi birden fazla kisiye
 * tek seferde eklemek icin). */
export async function createRecords(input: unknown): Promise<RecordsBatchResult> {
  const session = await requireSession();
  const parsed = recordsBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const { tarih, sonuc, dosyaNo, not } = parsed.data;
  const personnelIds = Array.from(new Set(parsed.data.personnelIds));
  const trainingIds = Array.from(new Set(parsed.data.trainingIds));

  let created = 0;
  for (const personnelId of personnelIds) {
    for (const trainingId of trainingIds) {
      const [inserted] = await db
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
        .returning();
      created++;
      const label = await recordLabel(personnelId, trainingId);
      await logActivity(
        session,
        'create',
        'kayit',
        inserted.id,
        label,
        `Eğitim kaydı eklendi: ${tarih} — ${sonuc}.`,
      );
    }
  }

  revalidateRecordPaths();
  return { ok: true, created };
}

export async function updateRecord(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireSession();
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
    await deleteCertificate(existing.driveFileId).catch(() => {});
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

const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadRecordCertificate(
  recordId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
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

    let sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
    if (!sonucRaw) {
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

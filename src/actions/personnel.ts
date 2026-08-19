'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { personnel, personnelHistory } from '@/db/schema';
import { canDeletePersonnel, requireAdmin, requireInternalSession } from '@/lib/session';
import { normName, splitName } from '@/lib/excel';
import { todayStr } from '@/lib/training-status';
import { isValidTcKimlikNo } from '@/lib/tc-kimlik-no';
import { logActivity, diffSummary } from '@/lib/audit';
import { deleteCertificate, DriveNotConfiguredError, uploadCertificate } from '@/lib/drive';
import { personnelSchema } from '@/schemas/personnel';
import type { ActionResult, CreateResult } from './training';

const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB

function revalidatePersonnelPaths() {
  revalidatePath('/personel');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
}

async function findTcConflict(tcNo: string | undefined, excludeId?: string) {
  if (!tcNo) return null;
  const matches = await db.select().from(personnel).where(eq(personnel.tcNo, tcNo));
  return matches.find((p) => p.id !== excludeId) ?? null;
}

export async function createPersonnel(input: unknown): Promise<CreateResult> {
  const session = await requireInternalSession();
  const parsed = personnelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const conflict = await findTcConflict(parsed.data.tcNo);
  if (conflict) {
    return {
      ok: false,
      error: `Bu TC Kimlik No zaten "${conflict.ad} ${conflict.soyad}" adlı personelde kayıtlı.`,
    };
  }
  const [inserted] = await db
    .insert(personnel)
    .values({ ...parsed.data, durum: 'Güncel' })
    .returning();
  revalidatePersonnelPaths();
  await logActivity(
    session,
    'create',
    'personel',
    inserted.id,
    `${inserted.ad} ${inserted.soyad}`,
    `Personel eklendi${inserted.firma ? ` (${inserted.firma})` : ''}.`,
  );
  return { ok: true, id: inserted.id };
}

export async function updatePersonnel(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireInternalSession();
  const parsed = personnelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const rawInput = input as Record<string, unknown>;
  const previousCikisTarihi =
    typeof rawInput.previousCikisTarihi === 'string'
      ? rawInput.previousCikisTarihi.trim() || null
      : null;

  const conflict = await findTcConflict(parsed.data.tcNo, id);
  if (conflict) {
    return {
      ok: false,
      error: `Bu TC Kimlik No zaten "${conflict.ad} ${conflict.soyad}" adlı personelde kayıtlı.`,
    };
  }

  const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
  if (!existing) {
    return { ok: false, error: 'Personel bulunamadı.' };
  }

  const nextFirma = parsed.data.firma || null;
  const nextGorev = parsed.data.gorev || null;
  const nextCalismaSekli = parsed.data.calismaSekli || null;
  const nextDurum = parsed.data.durum ?? existing.durum;
  const durumChangingToExit = existing.durum !== 'Çıkış' && nextDurum === 'Çıkış';
  const durumReactivating = existing.durum === 'Çıkış' && nextDurum === 'Güncel';
  const firmaChanged = (existing.firma ?? null) !== nextFirma;

  if (firmaChanged && !parsed.data.iseGirisTarihi) {
    return {
      ok: false,
      error: 'Firma değişikliği yapıldığında İşe Giriş Tarihi girilmesi zorunludur.',
    };
  }

  // Personel başka bir firmaya/göreve/çalışma şekline geçtiğinde ya da
  // "Çıkış" olarak işaretlendiğinde önceki dönemi kaybetmemek için, Excel
  // senkronizasyonundaki gibi mevcut değerleri geçmişe kaydet. Kayıtta
  // daha önce hiç istihdam bilgisi girilmemişse (tamamen boş oluşturulup
  // ilk kez dolduruluyorsa) gerçekte var olmamış bir "önceki dönem"
  // oluşturmamak için geçmiş kaydı atlanır.
  const hadEmploymentInfo =
    existing.firma !== null || existing.gorev !== null || existing.calismaSekli !== null;
  const employmentChanged =
    hadEmploymentInfo &&
    ((existing.firma ?? null) !== nextFirma ||
      (existing.gorev ?? null) !== nextGorev ||
      (existing.calismaSekli ?? null) !== nextCalismaSekli);
  if (employmentChanged || durumChangingToExit) {
    // Firma değişikliğinde önceki firmadan çıkış tarihi kullanıcıdan
    // istenir (opsiyonel, girilmezse boş bırakılır); ancak durum aynı anda
    // "Çıkış"a çevriliyorsa bu gerçek bir işten çıkış olduğu için tarih
    // girilmediyse bugünün tarihine düşülür (boş bırakılmaz). Diğer
    // durumlarda (sadece görev/çalışma şekli değişimi) bugünün tarihi
    // kullanılır.
    const historyCikisTarihi = durumChangingToExit
      ? previousCikisTarihi || todayStr()
      : firmaChanged
        ? previousCikisTarihi
        : todayStr();
    await db.insert(personnelHistory).values({
      personnelId: id,
      firma: existing.firma,
      gorev: existing.gorev,
      calismaSekli: existing.calismaSekli,
      girisTarihi: existing.iseGirisTarihi,
      cikisTarihi: historyCikisTarihi,
    });
  }

  const nextCikisTarihi = durumChangingToExit
    ? previousCikisTarihi || todayStr()
    : durumReactivating
      ? null
      : existing.cikisTarihi;

  await db
    .update(personnel)
    .set({
      tcNo: parsed.data.tcNo || null,
      ad: parsed.data.ad,
      soyad: parsed.data.soyad,
      gorev: nextGorev,
      firma: nextFirma,
      calismaSekli: nextCalismaSekli,
      dogumTarihi: parsed.data.dogumTarihi || null,
      iseGirisTarihi: parsed.data.iseGirisTarihi || null,
      durum: nextDurum,
      cikisTarihi: nextCikisTarihi,
    })
    .where(eq(personnel.id, id));
  revalidatePersonnelPaths();

  const summary = diffSummary(
    existing,
    {
      tcNo: parsed.data.tcNo || null,
      ad: parsed.data.ad,
      soyad: parsed.data.soyad,
      gorev: nextGorev,
      firma: nextFirma,
      calismaSekli: nextCalismaSekli,
      dogumTarihi: parsed.data.dogumTarihi || null,
      iseGirisTarihi: parsed.data.iseGirisTarihi || null,
      durum: nextDurum,
    },
    {
      tcNo: 'TC No',
      ad: 'Ad',
      soyad: 'Soyad',
      gorev: 'Görev',
      firma: 'Firma',
      calismaSekli: 'Çalışma Şekli',
      dogumTarihi: 'Doğum Tarihi',
      iseGirisTarihi: 'İşe Giriş Tarihi',
      durum: 'Durum',
    },
  );
  await logActivity(
    session,
    'update',
    'personel',
    id,
    `${parsed.data.ad} ${parsed.data.soyad}`,
    summary,
  );

  return { ok: true };
}

export async function deletePersonnel(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!canDeletePersonnel(session.user.email)) {
    return { ok: false, error: 'Personel silme yetkiniz yok.' };
  }
  const [existing] = await db.select().from(personnel).where(eq(personnel.id, id));
  await db.delete(personnel).where(eq(personnel.id, id));
  revalidatePersonnelPaths();
  if (existing) {
    await logActivity(
      session,
      'delete',
      'personel',
      id,
      `${existing.ad} ${existing.soyad}`,
      `Personel silindi (kayıt ve geçmiş verileri birlikte silindi).`,
    );
  }
  return { ok: true };
}

/** Mesleki Yeterlilik Kurumu (MYK) belgesini Google Drive'a yükler ve
 * personel kaydına bağlar. Eskiden yüklenmiş bir belge varsa önce onu
 * siler (tek belge tutulur). */
export async function uploadPersonnelMykBelgesi(
  personnelId: string,
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

  const [existing] = await db.select().from(personnel).where(eq(personnel.id, personnelId));
  if (!existing) {
    return { ok: false, error: 'Personel bulunamadı.' };
  }

  try {
    if (existing.mykBelgeDriveFileId) {
      await deleteCertificate(existing.mykBelgeDriveFileId).catch(() => {});
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { fileId, webViewLink } = await uploadCertificate({
      fileName: `${personnelId}-myk-${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    });
    await db
      .update(personnel)
      .set({ mykBelgeDriveFileId: fileId, mykBelgeDriveWebViewLink: webViewLink })
      .where(eq(personnel.id, personnelId));
  } catch (err) {
    if (err instanceof DriveNotConfiguredError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: `Belge yüklenemedi: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
    };
  }

  revalidatePersonnelPaths();
  await logActivity(
    session,
    'update',
    'personel',
    personnelId,
    `${existing.ad} ${existing.soyad}`,
    'MYK belgesi yüklendi.',
  );
  return { ok: true };
}

export async function deletePersonnelMykBelgesi(personnelId: string): Promise<ActionResult> {
  const session = await requireInternalSession();
  const [existing] = await db.select().from(personnel).where(eq(personnel.id, personnelId));
  if (!existing) {
    return { ok: false, error: 'Personel bulunamadı.' };
  }
  if (existing.mykBelgeDriveFileId) {
    await deleteCertificate(existing.mykBelgeDriveFileId).catch(() => {});
  }
  await db
    .update(personnel)
    .set({ mykBelgeDriveFileId: null, mykBelgeDriveWebViewLink: null })
    .where(eq(personnel.id, personnelId));
  revalidatePersonnelPaths();
  await logActivity(
    session,
    'update',
    'personel',
    personnelId,
    `${existing.ad} ${existing.soyad}`,
    'MYK belgesi kaldırıldı.',
  );
  return { ok: true };
}

export type PersonnelExcelRawRow = Record<string, string>;

export type PersonnelSyncResult =
  | {
      ok: true;
      created: number;
      updated: number;
      markedExit: number;
      skipped: number;
    }
  | { ok: false; error: string };

const toUpperTr = (v: string) => v.toLocaleUpperCase('tr-TR');

export async function syncPersonnelFromExcel(
  rows: PersonnelExcelRawRow[],
): Promise<PersonnelSyncResult> {
  const session = await requireAdmin();

  if (!Array.isArray(rows) || !rows.length) {
    return { ok: false, error: 'Excel dosyasında satır bulunamadı.' };
  }

  const existing = await db.select().from(personnel);
  const byTc = new Map(existing.filter((p) => p.tcNo).map((p) => [p.tcNo as string, p]));
  const byName = new Map(existing.map((p) => [normName(`${p.ad} ${p.soyad}`), p]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let markedExit = 0;
  const matchedIds = new Set<string>();

  // NOT: better-sqlite3 sürücüsü senkron çalışır; db.transaction() içindeki
  // callback async OLAMAZ (better-sqlite3 bunu reddeder) ve her sorgu
  // gerçekten çalışması için .run()/.get() ile sonlandırılmalıdır — aksi
  // halde sorgu inşa edilir ama hiçbir şey veritabanına yazılmaz.
  db.transaction((tx) => {
    for (const row of rows) {
      const tcNoRaw = (row['TC KİMLİK NO'] ?? '').trim();
      const tcNo = tcNoRaw && isValidTcKimlikNo(tcNoRaw) ? tcNoRaw : '';
      const adSoyad = toUpperTr((row['ADI SOYADI'] ?? '').trim());
      const firma = toUpperTr((row['FİRMA ADI'] ?? '').trim());
      const gorev = toUpperTr((row['GÖREV'] ?? '').trim());
      const dogumTarihi = (row['DOĞUM TARİHİ'] ?? '').trim();
      const iseGirisTarihi = (row['İŞE GİRİŞ TARİHİ'] ?? '').trim();

      if (!adSoyad) {
        skipped++;
        continue;
      }

      const match = (tcNo && byTc.get(tcNo)) || byName.get(normName(adSoyad));

      if (match) {
        matchedIds.add(match.id);
        const changed = (match.firma ?? '') !== firma || (match.gorev ?? '') !== gorev;
        if (changed) {
          tx.insert(personnelHistory)
            .values({
              personnelId: match.id,
              firma: match.firma,
              gorev: match.gorev,
              calismaSekli: match.calismaSekli,
              girisTarihi: match.iseGirisTarihi,
              cikisTarihi: todayStr(),
            })
            .run();
        }
        const resolvedTcNo = match.tcNo || tcNo || null;
        tx.update(personnel)
          .set({
            tcNo: resolvedTcNo,
            firma: firma || match.firma,
            gorev: gorev || match.gorev,
            dogumTarihi: match.dogumTarihi || dogumTarihi || null,
            iseGirisTarihi: match.iseGirisTarihi || iseGirisTarihi || null,
            durum: 'Güncel',
            cikisTarihi: null,
          })
          .where(eq(personnel.id, match.id))
          .run();
        const updatedMatch = {
          ...match,
          tcNo: resolvedTcNo,
          firma: firma || match.firma,
          gorev: gorev || match.gorev,
          dogumTarihi: match.dogumTarihi || dogumTarihi || null,
          iseGirisTarihi: match.iseGirisTarihi || iseGirisTarihi || null,
          durum: 'Güncel' as const,
          cikisTarihi: null,
        };
        if (resolvedTcNo) byTc.set(resolvedTcNo, updatedMatch);
        byName.set(normName(adSoyad), updatedMatch);
        updated++;
      } else {
        const { ad, soyad } = splitName(adSoyad);
        const inserted = tx
          .insert(personnel)
          .values({
            tcNo: tcNo || null,
            ad,
            soyad,
            firma: firma || null,
            gorev: gorev || null,
            dogumTarihi: dogumTarihi || null,
            iseGirisTarihi: iseGirisTarihi || null,
            durum: 'Güncel',
          })
          .returning()
          .get();
        matchedIds.add(inserted.id);
        if (inserted.tcNo) byTc.set(inserted.tcNo, inserted);
        byName.set(normName(adSoyad), inserted);
        created++;
      }
    }

    const toMarkExit = existing.filter((p) => p.durum === 'Güncel' && !matchedIds.has(p.id));
    markedExit = toMarkExit.length;
    for (const p of toMarkExit) {
      tx.insert(personnelHistory)
        .values({
          personnelId: p.id,
          firma: p.firma,
          gorev: p.gorev,
          calismaSekli: p.calismaSekli,
          girisTarihi: p.iseGirisTarihi,
          cikisTarihi: todayStr(),
        })
        .run();
      tx.update(personnel)
        .set({ durum: 'Çıkış', cikisTarihi: todayStr() })
        .where(eq(personnel.id, p.id))
        .run();
    }
  });

  revalidatePersonnelPaths();

  await logActivity(
    session,
    'update',
    'personel',
    null,
    'Excel Senkronizasyonu',
    `${created} oluşturuldu, ${updated} güncellendi, ${markedExit} çıkış, ${skipped} atlandı.`,
  );

  return { ok: true, created, updated, markedExit, skipped };
}

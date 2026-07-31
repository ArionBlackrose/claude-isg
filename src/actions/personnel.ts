'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { personnel, personnelHistory } from '@/db/schema';
import { requireAdmin, requireSession } from '@/lib/session';
import { normName, splitName } from '@/lib/excel';
import { personnelSchema } from '@/schemas/personnel';
import type { ActionResult } from './training';

export async function createPersonnel(input: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = personnelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  await db.insert(personnel).values({ ...parsed.data, durum: 'Güncel' });
  revalidatePath('/personel');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function syncPersonnelFromExcel(
  rows: PersonnelExcelRawRow[],
): Promise<PersonnelSyncResult> {
  await requireAdmin();

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
      const tcNo = (row['TC KİMLİK NO'] ?? '').trim();
      const adSoyad = (row['ADI SOYADI'] ?? '').trim();
      const firma = (row['FİRMA ADI'] ?? '').trim();
      const gorev = (row['GÖREV'] ?? '').trim();
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
        tx.update(personnel)
          .set({
            tcNo: match.tcNo || tcNo || null,
            firma: firma || match.firma,
            gorev: gorev || match.gorev,
            dogumTarihi: match.dogumTarihi || dogumTarihi || null,
            iseGirisTarihi: match.iseGirisTarihi || iseGirisTarihi || null,
            durum: 'Güncel',
            cikisTarihi: null,
          })
          .where(eq(personnel.id, match.id))
          .run();
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

  revalidatePath('/personel');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');

  return { ok: true, created, updated, markedExit, skipped };
}

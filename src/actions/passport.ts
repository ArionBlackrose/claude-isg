'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { statusFor, type TrainingStatusCode } from '@/lib/training-status';

export type PassportSearchInput = {
  tcNo?: string;
  ad?: string;
  soyad?: string;
  firma?: string;
};

export type PassportTrainingStatus = {
  trainingId: string;
  ad: string;
  code: TrainingStatusCode;
  label: string;
  tarih: string | null;
};

export type PassportResult = {
  id: string;
  ad: string;
  soyad: string;
  tcNo: string | null;
  firma: string | null;
  gorev: string | null;
  durum: 'Güncel' | 'Çıkış';
  trainings: PassportTrainingStatus[];
};

const MAX_RESULTS = 25;

async function requireExternalAccess() {
  const session = await requireSession();
  if (session.user.role !== 'dis' && session.user.role !== 'admin') {
    throw new Error('Bu işlem için yetkiniz yok.');
  }
}

/** Girilen T.C. kimlik no / ad / soyad / firma bilgilerine göre personeli
 * bulur ve sadece "3. Taraf" kategorisindeki eğitimler için durumunu
 * döner — Eğitim Pasaportu sorgu panelinin tek veri kaynağı budur. */
export async function searchPassport(input: PassportSearchInput): Promise<PassportResult[]> {
  await requireExternalAccess();

  const tcNo = (input.tcNo ?? '').trim();
  const ad = (input.ad ?? '').trim().toLocaleLowerCase('tr-TR');
  const soyad = (input.soyad ?? '').trim().toLocaleLowerCase('tr-TR');
  const firma = (input.firma ?? '').trim().toLocaleLowerCase('tr-TR');

  if (!tcNo && !ad && !soyad && !firma) return [];

  const [allPersonnel, thirdPartyTrainings, records] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training).where(eq(training.kategori, '3. Taraf')),
    db.select().from(trainingRecord),
  ]);

  const matches = allPersonnel.filter((p) => {
    if (tcNo && !(p.tcNo ?? '').includes(tcNo)) return false;
    if (ad && !p.ad.toLocaleLowerCase('tr-TR').includes(ad)) return false;
    if (soyad && !p.soyad.toLocaleLowerCase('tr-TR').includes(soyad)) return false;
    if (firma && !(p.firma ?? '').toLocaleLowerCase('tr-TR').includes(firma)) return false;
    return true;
  });

  return matches.slice(0, MAX_RESULTS).map((p) => ({
    id: p.id,
    ad: p.ad,
    soyad: p.soyad,
    tcNo: p.tcNo,
    firma: p.firma,
    gorev: p.gorev,
    durum: p.durum,
    trainings: thirdPartyTrainings.map((t) => {
      const status = statusFor(p.id, t.id, records, t);
      return {
        trainingId: t.id,
        ad: t.ad,
        code: status.code,
        label: status.label,
        tarih: status.tarih,
      };
    }),
  }));
}

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
// Tek karakterli sorgularla tüm personel tablosunun taranmasını (harf harf
// deneyerek veri toplama) engellemek için her doldurulan alan en az bu
// kadar karakter içermeli.
const MIN_QUERY_LENGTH = 2;

async function requireExternalAccess() {
  const session = await requireSession();
  if (session.user.role !== 'dis' && session.user.role !== 'admin') {
    throw new Error('Bu işlem için yetkiniz yok.');
  }
  return session;
}

/** Girilen T.C. kimlik no / ad / soyad / firma bilgilerine göre personeli
 * bulur ve sadece admin tarafından "Pasaportta göster" olarak işaretlenmiş
 * eğitimler için durumunu döner — Eğitim Pasaportu sorgu panelinin tek veri
 * kaynağı budur. "dis" rolündeki dış kullanıcılar, hesaplarına admin
 * tarafından atanan firmayla sınırlı sonuç alır; admin sınırsız sorgular. */
export async function searchPassport(input: PassportSearchInput): Promise<PassportResult[]> {
  const session = await requireExternalAccess();

  const tcNo = (input.tcNo ?? '').trim();
  const ad = (input.ad ?? '').trim().toLocaleLowerCase('tr-TR');
  const soyad = (input.soyad ?? '').trim().toLocaleLowerCase('tr-TR');
  const firma = (input.firma ?? '').trim().toLocaleLowerCase('tr-TR');

  if (!tcNo && !ad && !soyad && !firma) return [];
  const tooShort = [tcNo, ad, soyad, firma].some(
    (v) => v.length > 0 && v.length < MIN_QUERY_LENGTH,
  );
  if (tooShort) return [];

  // Dış kullanıcı hesabına bir firma atanmışsa (admin panelinden
  // zorunlu), sorgu sadece o firmadaki personelle sınırlanır — böylece
  // bir firmanın hesabı başka bir firmanın personelinin T.C. kimlik no
  // gibi kişisel verilerini göremez.
  const accountFirma =
    session.user.role === 'dis' && 'firma' in session.user && typeof session.user.firma === 'string'
      ? session.user.firma.trim().toLocaleLowerCase('tr-TR')
      : '';

  const [allPersonnel, visibleTrainings, records] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training).where(eq(training.pasaportGoster, true)),
    db.select().from(trainingRecord),
  ]);

  const matches = allPersonnel.filter((p) => {
    if (accountFirma && !(p.firma ?? '').toLocaleLowerCase('tr-TR').includes(accountFirma)) {
      return false;
    }
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
    trainings: visibleTrainings.map((t) => {
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

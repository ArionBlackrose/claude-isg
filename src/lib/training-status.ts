import { addMonths, daysBetween, todayStr } from './date';

export { addMonths, daysBetween, todayStr, fmtDate } from './date';

export type TrainingRecordLike = {
  personnelId: string;
  trainingId: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
};

export type TrainingLike = {
  id: string;
  gecerlilikAy: number;
};

export type TrainingStatusCode = 'expired' | 'soon' | 'valid' | 'none';

export type TrainingStatus = {
  code: TrainingStatusCode;
  label: string;
  tarih: string | null;
};

export type StatusTagTone = 'ok' | 'warn' | 'bad' | 'none';

export function toneForTrainingStatus(code: TrainingStatusCode): StatusTagTone {
  if (code === 'expired') return 'bad';
  if (code === 'soon') return 'warn';
  if (code === 'valid') return 'ok';
  return 'none';
}

export function toneForDurum(durum: 'Güncel' | 'Çıkış'): StatusTagTone {
  return durum === 'Çıkış' ? 'bad' : 'ok';
}

export function toneForSonuc(sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı'): StatusTagTone {
  if (sonuc === 'Başarılı') return 'ok';
  if (sonuc === 'Başarısız') return 'bad';
  return 'none';
}

/** Bir personelin bir eğitimdeki güncel durumunu, en son "Başarılı" kayıt ve
 * eğitimin geçerlilik süresine göre hesaplar. */
export function statusFor(
  personnelId: string,
  trainingId: string,
  records: TrainingRecordLike[],
  training: TrainingLike | undefined,
): TrainingStatus {
  const successRecords = records
    .filter(
      (r) => r.personnelId === personnelId && r.trainingId === trainingId && r.sonuc === 'Başarılı',
    )
    .sort((a, b) => b.tarih.localeCompare(a.tarih));

  if (!successRecords.length) {
    return { code: 'none', label: 'Almadı', tarih: null };
  }

  const last = successRecords[0];
  if (!training || !training.gecerlilikAy) {
    return { code: 'valid', label: last.tarih, tarih: last.tarih };
  }

  const expiry = addMonths(last.tarih, training.gecerlilikAy);
  const diff = daysBetween(todayStr(), expiry);

  if (diff < 0) return { code: 'expired', label: 'Süresi Doldu', tarih: last.tarih };
  if (diff <= 30) return { code: 'soon', label: `Yaklaşıyor (${diff}g)`, tarih: last.tarih };
  return { code: 'valid', label: last.tarih, tarih: last.tarih };
}

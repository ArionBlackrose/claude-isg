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

export function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);
  const mm = String(targetMonthIndex + 1).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

const istanbulDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });

export function todayStr(): string {
  return istanbulDateFormatter.format(new Date());
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

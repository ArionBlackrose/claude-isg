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

/** Verilen yıl/ay (1-12) için ayın kaç gün çektiğini döner. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonthIndex + 1));
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

/** "YYYY-MM-DD" formatındaki bir tarihi "GG.AA.YYYY" olarak biçimlendirir. */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
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

/** Bir eğitim durum koduna karşılık gelen rozet (tag) CSS sınıfı. */
export function tagClassFor(code: TrainingStatusCode): string {
  if (code === 'expired') return 'tag-bad';
  if (code === 'soon') return 'tag-warn';
  if (code === 'valid') return 'tag-ok';
  return 'tag-none';
}

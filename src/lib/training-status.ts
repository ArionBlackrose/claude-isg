import { addMonths, daysBetween, todayStr, fmtDate } from './date';

export { addMonths, daysBetween, daysInMonth, fmtDate, fmtDateTime, todayStr } from './date';

export type TrainingRecordLike = {
  personnelId: string;
  trainingId: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı' | 'Katıldı';
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

export function toneForSonuc(
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı' | 'Katıldı',
): StatusTagTone {
  if (sonuc === 'Başarılı' || sonuc === 'Katıldı') return 'ok';
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

export type ExpiryStatus = { code: 'expired' | 'soon' | 'valid'; label: string };

/** Bir son kullanma/geçerlilik tarihinin durumunu hesaplar (ör. MYK belgesi
 * geçerlilik tarihi). Tarih girilmemişse null döner. */
export function expiryStatus(gecerlilikTarihi: string | null | undefined): ExpiryStatus | null {
  if (!gecerlilikTarihi) return null;
  const diff = daysBetween(todayStr(), gecerlilikTarihi);
  if (diff < 0) return { code: 'expired', label: 'Süresi Doldu' };
  if (diff <= 30) return { code: 'soon', label: `Yaklaşıyor (${diff}g)` };
  return { code: 'valid', label: fmtDate(gecerlilikTarihi) };
}

/** Bir eğitim durum koduna karşılık gelen rozet (tag) CSS sınıfı. */
export function tagClassFor(code: TrainingStatusCode): string {
  if (code === 'expired') return 'tag-bad';
  if (code === 'soon') return 'tag-warn';
  if (code === 'valid') return 'tag-ok';
  return 'tag-none';
}

/** Rapor gösterge kartları gibi ikon/vurgu-rengi gerektiren yerlerde
 * kullanılan ton → CSS sınıfı eşlemesi. `tagClassFor`'un rozet metni yerine
 * kart/ikon çerçevesi için tam Tailwind sınıfı döndürmesi gerektiğinden ayrı
 * tutulur, ama aynı üç semantik renge (primary/warning/danger) dayanır —
 * tek kaynak burası olsun diye `tagClassFor` ile aynı modülde tanımlanır.
 * Sınıflar derleme zamanında taranabilsin diye tam metin olarak yazılır. */
export const TONE_CLASSES = {
  primary: {
    bar: 'bg-primary',
    badge: 'bg-primary/15 text-primary',
    border: 'hover:border-primary',
  },
  warning: {
    bar: 'bg-warning',
    badge: 'bg-warning/15 text-warning',
    border: 'hover:border-warning',
  },
  danger: {
    bar: 'bg-danger',
    badge: 'bg-danger/15 text-danger',
    border: 'hover:border-danger',
  },
} as const;

/** Bir eğitim kaydının sonuç değerine (Başarılı/Başarısız/Katılmadı)
 * karşılık gelen rozet (tag) CSS sınıfı. */
export function tagClassForSonuc(sonuc: string): string {
  if (sonuc === 'Başarılı' || sonuc === 'Katıldı') return 'tag-ok';
  if (sonuc === 'Başarısız') return 'tag-bad';
  return 'tag-none';
}

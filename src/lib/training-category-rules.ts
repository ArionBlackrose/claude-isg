/** "Uyarı" (warning) kategorisindeki eğitimler için tek kaynak kural seti.
 * Bu kategori, genel kayıt ekleme akışlarından (Eğitim Ekle, Kayıtlar,
 * Excel içe aktarma) hariç tutulup sadece Uyarı Eğitimleri panelinden
 * eklenebilir olmalı — kural burada tek yerde tanımlanır, tüm sunucu
 * action'ları (createRecord, createRecords, createUyariRecords,
 * importRecordsFromExcel) ve UI (Eğitim Ekle listesi, Kayıtlar hücre
 * diyaloğu) buradan içe aktarır. */
export const RESTRICTED_TRAINING_CATEGORY = 'Uyarı';

const GENERAL_REJECTION_MESSAGE =
  'Uyarı eğitimi kayıtları sadece Uyarı Eğitimleri panelinden eklenebilir.';
const UYARI_ONLY_REJECTION_MESSAGE =
  'Uyarı kategorisinde değil; bu panelden sadece Uyarı eğitimleri eklenebilir.';

/** Genel kayıt ekleme akışları (Eğitim Ekle, Kayıtlar, Excel içe aktarma)
 * için: eğitim bulunamadıysa ya da kategorisi Uyarı ise reddeder — bilinmeyen
 * bir eğitim kimliğini "sorun yok" sayıp kısıtlamayı sessizce atlamamak için
 * eğitim bulunamama durumu da hata döner. */
export function getGeneralCreationError(kategori: string | undefined): string | null {
  if (kategori === undefined) return 'Eğitim bulunamadı.';
  return kategori === RESTRICTED_TRAINING_CATEGORY ? GENERAL_REJECTION_MESSAGE : null;
}

/** Uyarı Eğitimleri paneli için: eğitim bulunamadıysa ya da kategorisi Uyarı
 * DEĞİLSE reddeder. */
export function getUyariOnlyCreationError(kategori: string | undefined): string | null {
  if (kategori === undefined) return 'Eğitim bulunamadı.';
  return kategori !== RESTRICTED_TRAINING_CATEGORY ? UYARI_ONLY_REJECTION_MESSAGE : null;
}

/** Uyarı eğitimlerinde "sonuç" katılım durumunu ifade eder (Katıldı/Katılmadı)
 * — Başarılı/Başarısız genel eğitimlere özgüdür ve Uyarı kaydında anlamsızdır. */
export const UYARI_SONUC_VALUES = ['Katıldı', 'Katılmadı'] as const;

export function getUyariSonucError(sonuc: string): string | null {
  return (UYARI_SONUC_VALUES as readonly string[]).includes(sonuc)
    ? null
    : 'Uyarı eğitimi sonucu sadece "Katıldı" veya "Katılmadı" olabilir.';
}

export function getGeneralSonucError(sonuc: string): string | null {
  return sonuc === 'Katıldı' ? '"Katıldı" sonucu sadece Uyarı eğitimlerinde kullanılabilir.' : null;
}

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

/** Genel eğitimlerde Dosya No her zaman zorunludur. Uyarı eğitimlerinde ise
 * personel eğitime gönderildiğinde (henüz katılmadıysa) zorunlu değildir —
 * ancak "Katıldı" işaretlendiğinde zorunlu hale gelir. Sunucu action'ları
 * (`getDosyaNoError`) ve client form'ları (zorunluluk yıldızı, buton
 * doğrulaması) bu tek fonksiyonu paylaşır — kural iki yerde ayrı ayrı
 * tutulmaz. */
export function isDosyaNoRequired(mode: 'general' | 'uyari', sonuc: string): boolean {
  return mode === 'general' || sonuc === 'Katıldı';
}

export function getDosyaNoError(
  mode: 'general' | 'uyari',
  sonuc: string,
  dosyaNo: string | undefined,
): string | null {
  return isDosyaNoRequired(mode, sonuc) && !dosyaNo?.trim() ? 'Dosya No zorunlu.' : null;
}

/** Sertifika yükleme sadece bu iki kategori için anlamlıdır — Temel İSG
 * eğitimleri "Zorunlu" kategorisinde tutulur, dış kurum/yüklenici eğitimleri
 * ise "3. Taraf" kategorisinde. Diğer kategorilerde (Genel, Özel, Uyarı)
 * sertifika yükleme seçeneği ne gösterilir ne de sunucu tarafında kabul
 * edilir — src/components/log/kayit-edit-dialog.tsx (UI) ve
 * src/actions/records.ts uploadRecordCertificate (sunucu) bu tek kaynağı
 * paylaşır. */
export const CERTIFICATE_UPLOAD_CATEGORIES = ['Zorunlu', '3. Taraf'] as const;

export function canUploadCertificate(kategori: string | undefined): boolean {
  return (
    kategori !== undefined &&
    (CERTIFICATE_UPLOAD_CATEGORIES as readonly string[]).includes(kategori)
  );
}

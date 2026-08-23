/** Fabrika sıfırlama kategorilerinin katalog tanımı — sadece string/tip
 * verisi içerir, herhangi bir DB veya sunucu-only bağımlılığı (googleapis
 * vb.) YOKTUR. Bu dosya bilinçli olarak `src/lib/factory-reset.ts`'ten
 * ayrıdır: o dosya `src/lib/drive.ts` üzerinden `googleapis`'i (Node-only,
 * `net` modülüne ihtiyaç duyar) içe aktarıyor — client component'lerin
 * (ör. factory-reset-form.tsx) katalogdan tek bir alan okumak için o zinciri
 * client bundle'a sürüklememesi gerekir. */

/** Sistemi yeni bir şantiye/firma için yeniden kullanıma hazırlarken admin'in
 * silebileceği veri kategorileri — her biri tek başına veya birlikte
 * seçilebilir. Sıra, admin panelindeki gösterim sırasını da belirler.
 *
 * Kategoriler arasındaki bağımlılıklar bilinçli olarak UI'da zorunlu
 * kılınmaz: "Eğitim Kataloğu" veya "Personel" silinirse, SQLite'ın
 * `ON DELETE CASCADE` kuralları (bkz. src/db/schema.ts) o kayıtlara bağlı
 * eğitim kayıtlarını/disiplin işlemlerini/geçmişi otomatik olarak birlikte
 * siler — bu yüzden ayrı bir "önce şunu seç" doğrulamasına gerek yoktur,
 * cascade zaten veritabanı bütünlüğünü korur. */
export const RESET_CATEGORIES = [
  {
    key: 'personel',
    label: 'Personel',
    description:
      'Tüm personel kayıtları. Cascade: bu personele ait eğitim kayıtları, uyarı kayıtları, disiplin işlemleri ve firma geçmişi de birlikte silinir.',
  },
  {
    key: 'katalog',
    label: 'Eğitim Kataloğu',
    description:
      'Tüm eğitim türü tanımları (Genel/Zorunlu/Özel/Uyarı/3. Taraf). Cascade: bu eğitim türlerine ait tüm eğitim kayıtları da birlikte silinir.',
  },
  {
    key: 'egitim_kayitlari',
    label: 'Eğitim Kayıtları',
    description: 'Uyarı dışındaki tüm eğitim kayıtları (Genel/Zorunlu/Özel/3. Taraf).',
  },
  {
    key: 'uyari_kayitlari',
    label: 'Uyarı Eğitimi Kayıtları',
    description: 'Uyarı kategorisindeki eğitim kayıtları.',
  },
  {
    key: 'disiplin',
    label: 'Disiplin İşlemleri',
    description: 'Uyarı eğitimleri panelinde uygulanan disiplin işlemi kayıtları.',
  },
  {
    key: 'kullanicilar',
    label: 'Kullanıcılar',
    description:
      'Kendi hesabınız hariç tüm kullanıcı hesapları (Yönetici/Kullanıcı/Dış Kullanıcı) ve yetkileri.',
  },
  {
    key: 'proje',
    label: 'Proje Bilgileri',
    description: 'Proje/şantiye adı, açıklaması ve başlangıç tarihi varsayılana döner.',
  },
  {
    key: 'aktivite',
    label: 'Aktivite Geçmişi',
    description: 'Denetim kaydı (kim ne yaptı) ve gönderilen bildirim geçmişi.',
  },
] as const;

export type ResetCategoryKey = (typeof RESET_CATEGORIES)[number]['key'];

export const ALL_RESET_CATEGORY_KEYS: ResetCategoryKey[] = RESET_CATEGORIES.map((c) => c.key);

export function isValidResetCategoryKey(key: string): key is ResetCategoryKey {
  return (ALL_RESET_CATEGORY_KEYS as string[]).includes(key);
}

export type FactoryResetSummary = {
  counts: Partial<Record<ResetCategoryKey, number>>;
  driveWarnings: string[];
};

/** Admin bu tam metni birebir yazmadan sıfırlama gerçekleşmez — yanlışlıkla
 * tıklamayı imkansız kılmak için tek bir onay tık'ı değil, bilinçli bir
 * yazma eylemi gerektirir. "use server" dosyaları (src/actions/system-
 * reset.ts) sadece async fonksiyon export edebildiği için bu sabit burada
 * tanımlanır, client component de aynı kaynaktan okur. */
export const FACTORY_RESET_CONFIRMATION_PHRASE = 'SİSTEMİ SIFIRLA';

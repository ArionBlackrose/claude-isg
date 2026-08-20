// Personel ve eğitim türü silme geri alınamaz işlemler olduğu için
// (kayıtlar ve geçmiş dönemler de birlikte silinir) tam yetkili adminler
// arasında bile sadece bu iki hesapla sınırlandırıldı.
const DESTRUCTIVE_DELETE_ALLOWED_EMAILS = ['xechto@gmail.com', 'sethblackrose@gmail.com'];

export function canDeletePersonnel(email: string): boolean {
  return DESTRUCTIVE_DELETE_ALLOWED_EMAILS.includes(email);
}

export function canDeleteTraining(email: string): boolean {
  return DESTRUCTIVE_DELETE_ALLOWED_EMAILS.includes(email);
}

/** Admin'in "Kullanıcılar" sayfasındaki Yetkiler diyaloğundan kullanıcı
 * bazında açıp kapatabildiği granüler yetki kataloğu — tek kaynak burasıdır;
 * hem admin UI'ı hem sunucu action'ları (searchPassport vb.) buradan
 * içe aktarır. Yeni bir yetki eklemek için sadece bu listeye bir satır
 * eklemek yeterlidir; UI dialog grupları otomatik olarak `group` alanına
 * göre oluşur. Bugün yalnızca "dış kullanıcı" (Eğitim Pasaportu) hesapları
 * için kullanılıyor, ama katalog role bağımlı değildir — ileride "user"
 * rolü için de aynı mekanizma kullanılabilir. */
export const PERMISSION_CATALOG = [
  // Sorgu sonucunda hangi kişisel/idari alanların görüneceğini kontrol
  // eder — varsayılan olarak kapalıdır, admin tek tek açar.
  {
    key: 'pasaport.tc_no_gor',
    group: 'Görünür Bilgiler',
    label: 'T.C. Kimlik No görebilir',
    description: 'Kapalı olduğunda sorgu sonuçlarında T.C. Kimlik No gizlenir.',
  },
  {
    key: 'pasaport.gorev_gor',
    group: 'Görünür Bilgiler',
    label: 'Görev bilgisini görebilir',
    description: 'Kapalı olduğunda sorgu sonuçlarında personelin görevi gizlenir.',
  },
  {
    key: 'pasaport.firma_gor',
    group: 'Görünür Bilgiler',
    label: 'Firma bilgisini görebilir',
    description: 'Kapalı olduğunda sorgu sonuçlarında personelin bağlı olduğu firma gizlenir.',
  },
  {
    key: 'pasaport.durum_gor',
    group: 'Görünür Bilgiler',
    label: 'Çalışma durumunu görebilir',
    description:
      'Kapalı olduğunda "Güncel / Çıkış" etiketi gizlenir — personelin hâlâ çalışıp çalışmadığı görünmez.',
  },
  // Sorgu sonucunda eğitim geçmişinin ne kadarının görüneceğini kontrol
  // eder.
  {
    key: 'pasaport.egitim_tarihi_gor',
    group: 'Eğitim Geçmişi',
    label: 'Eğitim tarihlerini görebilir',
    description:
      'Kapalı olduğunda sadece eğitim durumu (geçerli/süresi dolmuş) görünür, alınma tarihi gizlenir.',
  },
  {
    key: 'pasaport.suresi_dolmus_egitim_gor',
    group: 'Eğitim Geçmişi',
    label: 'Süresi dolmuş eğitimleri görebilir',
    description:
      'Kapalı olduğunda listede yalnızca hâlâ geçerli eğitimler görünür, süresi dolmuş olanlar gizlenir.',
  },
  // Hesabın hangi firmalarda arama yapabileceğini kontrol eder.
  {
    key: 'pasaport.tum_firmalarda_arama',
    group: 'Arama Kapsamı',
    label: 'Tüm firmalarda arama yapabilir',
    description:
      'Açıldığında hesaba atanmış firma sınırlaması kaldırılır; kapalıyken sorgular yalnızca hesabın firmasıyla sınırlıdır.',
  },
  // Sonuçları sistem dışına çıkarma yetkisi.
  {
    key: 'pasaport.excel_indir',
    group: 'Dışa Aktarma',
    label: 'Sonuçları Excel olarak indirebilir',
    description: 'Açıldığında sorgu sonuçları için "Excel İndir" butonu görünür.',
  },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]['key'];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((p) => p.key);

export function isValidPermissionKey(key: string): key is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(key);
}

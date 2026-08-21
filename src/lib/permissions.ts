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

/** Granüler yetkilerin hangi hesap rolü için anlamlı olduğunu belirtir.
 * "dis" hesapları zaten layout seviyesinde /pasaport'a kilitlendiği için
 * (bkz. src/app/(app)/layout.tsx) sadece pasaport.* yetkileri onlar için
 * anlamlıdır; "user" hesapları tüm normal panellere erişebildiği için
 * panel.* yetkileri onlar için anlamlıdır. "admin" hiçbir zaman bu
 * kataloğa bakmaz — her zaman tam erişimlidir. */
type PermissionRole = 'user' | 'dis';

/** Admin'in "Kullanıcılar" sayfasındaki Yetkiler diyaloğundan kullanıcı
 * bazında açıp kapatabildiği granüler yetki kataloğu — tek kaynak burasıdır;
 * hem admin UI'ı hem sunucu action'ları buradan içe aktarır. Yeni bir yetki
 * eklemek için sadece bu listeye bir satır eklemek yeterlidir; UI dialog
 * grupları otomatik olarak `group` alanına göre, hesap türüne uygun
 * yetkiler ise `roles` alanına göre filtrelenir.
 *
 * `enforced` alanı, o yetkinin en az bir sayfa/action tarafından gerçekten
 * kontrol edildiğini belirtir — bugün kataloğun tamamı uygulanıyor
 * (bkz. src/lib/session.ts requirePanelAccess ve src/actions/passport.ts).
 * Yeni bir yetki eklerken önce `enforced: false` ile katalog+UI'ı kurup,
 * gerçek kontrolü ayrı bir adımda ekleyip ardından `true` yapmak güvenli
 * bir sırayı korur — admin UI bu ayrımı "(henüz uygulanmıyor)" notuyla
 * gösterir.
 *
 * `defaultWhenUnconfigured` alanı, permissionsConfigured=false olan (admin
 * hiç Yetkiler diyaloğunu kaydetmemiş) bir "user" hesabı için bu yetkinin
 * varsayılan olarak açık mı kapalı mı sayılacağını belirtir —
 * src/lib/session.ts'teki isPermissionGranted buradan okur. Bu alan,
 * yetkinin YENİ bir uygulamadan önce hangi davranışı DEĞİŞTİRDİĞİNE göre
 * seçilir, tek bir global kural değildir:
 *   - `true`: yetki eklenmeden önce herhangi bir iç kullanıcının zaten
 *     serbestçe yapabildiği bir şeyi kısıtlıyor (ör. panel.* sayfa erişimi,
 *     kayit.duzenle — Uyarı dışı kayıt düzenleme her zaman herkese açıktı).
 *     Geriye dönük uyumluluk için varsayılan açık olmalı.
 *   - `false`: yetki eklenmeden önce bu işlem zaten daha sıkı bir kuralla
 *     (ör. sadece admin) kısıtlıydı — varsayılan açık yaparsak o eski sıkı
 *     kuralı sessizce kaldırmış oluruz. uyari.duzenle bunun tek örneğidir:
 *     Uyarı eğitimi kayıtları bu yetki eklenmeden önce SADECE admin
 *     tarafından düzenlenebiliyordu; varsayılanı "açık" yapmak bu korumayı
 *     kaldırırdı. */
export const PERMISSION_CATALOG = [
  // --- "dis" (Eğitim Pasaportu) hesapları için: sorgu sonucunda hangi
  // kişisel/idari alanların görüneceğini kontrol eder — varsayılan olarak
  // kapalıdır, admin tek tek açar. Tamamı searchPassport'ta uygulanıyor.
  {
    key: 'pasaport.tc_no_gor',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Görünür Bilgiler',
    label: 'T.C. Kimlik No görebilir',
    description: 'Kapalı olduğunda sorgu sonuçlarında T.C. Kimlik No gizlenir.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'pasaport.gorev_gor',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Görünür Bilgiler',
    label: 'Görev bilgisini görebilir',
    description: 'Kapalı olduğunda sorgu sonuçlarında personelin görevi gizlenir.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'pasaport.firma_gor',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Görünür Bilgiler',
    label: 'Firma bilgisini görebilir',
    description: 'Kapalı olduğunda sorgu sonuçlarında personelin bağlı olduğu firma gizlenir.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'pasaport.durum_gor',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Görünür Bilgiler',
    label: 'Çalışma durumunu görebilir',
    description:
      'Kapalı olduğunda "Güncel / Çıkış" etiketi gizlenir — personelin hâlâ çalışıp çalışmadığı görünmez.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  // Sorgu sonucunda eğitim geçmişinin ne kadarının görüneceğini kontrol
  // eder.
  {
    key: 'pasaport.egitim_tarihi_gor',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Eğitim Geçmişi',
    label: 'Eğitim tarihlerini görebilir',
    description:
      'Kapalı olduğunda sadece eğitim durumu (geçerli/süresi dolmuş) görünür, alınma tarihi gizlenir.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'pasaport.suresi_dolmus_egitim_gor',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Eğitim Geçmişi',
    label: 'Süresi dolmuş eğitimleri görebilir',
    description:
      'Kapalı olduğunda listede yalnızca hâlâ geçerli eğitimler görünür, süresi dolmuş olanlar gizlenir.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  // Hesabın hangi firmalarda arama yapabileceğini kontrol eder.
  {
    key: 'pasaport.tum_firmalarda_arama',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Arama Kapsamı',
    label: 'Tüm firmalarda arama yapabilir',
    description:
      'Açıldığında hesaba atanmış firma sınırlaması kaldırılır; kapalıyken sorgular yalnızca hesabın firmasıyla sınırlıdır.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  // Sonuçları sistem dışına çıkarma yetkisi.
  {
    key: 'pasaport.excel_indir',
    roles: ['dis'] as PermissionRole[],
    group: 'Eğitim Pasaportu — Dışa Aktarma',
    label: 'Sonuçları Excel olarak indirebilir',
    description: 'Açıldığında sorgu sonuçları için "Excel İndir" butonu görünür.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },

  // --- "user" (normal iç kullanıcı) hesapları için: hangi panellere
  // erişebileceğini kontrol eder. src/lib/session.ts'teki requirePanelAccess
  // tarafından her ilgili page.tsx'te ve o panele özgü server action'larda
  // uygulanır (bkz. panel bazlı action gate'leri).
  {
    key: 'panel.egitim_ekle',
    roles: ['user'] as PermissionRole[],
    group: 'Panel Erişimi',
    label: '"Eğitim Ekle" sayfasına erişebilir',
    description: 'Ana sayfadaki tekli/toplu eğitim kaydı ekleme panelini kapsar.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'panel.kayitlar',
    roles: ['user'] as PermissionRole[],
    group: 'Panel Erişimi',
    label: '"Kayıtlar" sayfasına erişebilir',
    description: 'Personel × eğitim durum matrisini ve kayıt düzenlemeyi kapsar.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'panel.rapor',
    roles: ['user'] as PermissionRole[],
    group: 'Panel Erişimi',
    label: '"Rapor" sayfasına erişebilir',
    description: 'Eğitim durum özetlerini ve adam-saat raporunu kapsar.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'panel.personel',
    roles: ['user'] as PermissionRole[],
    group: 'Panel Erişimi',
    label: '"Personel" sayfasına erişebilir',
    description: 'Personel listesini, detayını ve manuel ekleme formunu kapsar.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'panel.katalog',
    roles: ['user'] as PermissionRole[],
    group: 'Panel Erişimi',
    label: '"Eğitim Kataloğu" sayfasına erişebilir',
    description: 'Eğitim türlerini listeleme ve yeni eğitim türü tanımlamayı kapsar.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'panel.uyari',
    roles: ['user'] as PermissionRole[],
    group: 'Panel Erişimi',
    label: '"Uyarı Eğitimleri" sayfasına erişebilir',
    description: 'Uyarı eğitimi kayıtlarını ve disiplin işlemi panelini kapsar.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },

  // --- Panel içi aksiyon yetkileri: sadece sayfaya erişimi değil, o
  // sayfada neyin YAPILABİLECEĞİNİ ayrıca kontrol eder. Bir hesap bu
  // yetkilerden birine sahip olmadan da ilgili paneli görebilir — sadece
  // ilgili aksiyon (kayıt girişi, düzenleme) engellenir.
  {
    key: 'kayit.duzenle',
    roles: ['user'] as PermissionRole[],
    group: 'Kayıt İşlemleri',
    label: 'Genel eğitim kayıtlarını ekleyebilir/düzenleyebilir',
    description:
      'Kapalıyken "Kayıtlar" panelindeki ya da personel detayındaki bir kayıt hücresine tıklanabilir ama yeni kayıt eklenemez, düzenleme/silme yapılamaz, yalnızca görüntülenir. Uyarı kategorisindeki kayıtlar bu yetkiye dahil değildir, ayrı yetkilendirilir (bkz. Uyarı Eğitimleri — İşlemler).',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'uyari.giris',
    roles: ['user'] as PermissionRole[],
    group: 'Uyarı Eğitimleri — İşlemler',
    label: 'Uyarı eğitimi girişi yapabilir',
    description: 'Kapalıyken "Uyarı Eğitimleri" sayfası görülebilir ama yeni kayıt eklenemez.',
    enforced: true,
    defaultWhenUnconfigured: true,
  },
  {
    key: 'uyari.duzenle',
    roles: ['user'] as PermissionRole[],
    group: 'Uyarı Eğitimleri — İşlemler',
    label: 'Uyarı eğitimi kayıtlarını düzenleyebilir',
    description:
      'Kapalıyken mevcut uyarı eğitimi kayıtları düzenlenemez, sadece görüntülenir. Bu yetki eklenmeden önce uyarı kayıtları sadece admin tarafından düzenlenebiliyordu — o korumayı korumak için yapılandırılmamış hesaplarda varsayılan olarak KAPALIDIR (diğer panel.*/kayit.duzenle/uyari.giris yetkilerinin aksine).',
    enforced: true,
    defaultWhenUnconfigured: false,
  },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]['key'];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATALOG.map((p) => p.key);

export function isValidPermissionKey(key: string): key is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(key);
}

const DEFAULT_WHEN_UNCONFIGURED_BY_KEY = new Map<PermissionKey, boolean>(
  PERMISSION_CATALOG.map((p) => [p.key, p.defaultWhenUnconfigured]),
);

/** permissionsConfigured=false olan (hiç yapılandırılmamış) bir hesap için
 * bu yetkinin varsayılan olarak açık mı kapalı mı sayılacağını döner —
 * bkz. PERMISSION_CATALOG'daki `defaultWhenUnconfigured` alan yorumu.
 * src/lib/session.ts'teki isPermissionGranted tarafından kullanılır. */
export function getPermissionDefaultWhenUnconfigured(key: PermissionKey): boolean {
  return DEFAULT_WHEN_UNCONFIGURED_BY_KEY.get(key) ?? true;
}

/** Bir hesap rolü için anlamlı olan katalog satırlarını döner — Yetkiler
 * diyaloğu ve updateUserPermissions bu filtreyi kullanır, böylece "dis" bir
 * hesaba panel.* ya da "user" bir hesaba pasaport.* yetkileri sunulmaz veya
 * kaydedilmez. */
export function getPermissionsForRole(role: PermissionRole) {
  return PERMISSION_CATALOG.filter((p) => (p.roles as readonly string[]).includes(role));
}

export function getPermissionKeysForRole(role: PermissionRole): PermissionKey[] {
  return getPermissionsForRole(role).map((p) => p.key);
}

/** "user" hesapları için Yetkiler diyaloğunda tek tıkla uygulanabilen hazır
 * yetki şablonları — diğer sitelerdeki yaygın rol adlandırmasına karşılık
 * gelir. Admin panelindeki "Roller" satırında hesabın gerçek rolünü
 * değiştiren üç temel rolle (Yönetici/Kullanıcı/Dış Kullanıcı) birlikte,
 * tek bir buton listesi olarak gösterilir (bkz.
 * src/components/admin/user-permissions-dialog.tsx). Bir şablona tıklamak
 * hesabı hemen "user" rolüne (henüz değilse) geçirip bu izin setini
 * uygular — Kaydet'e basmaya gerek kalmadan anında etkili olur; admin
 * dilerse sonrasında aşağıdaki listeden elle ince ayar yapıp ayrıca
 * kaydedebilir. */
export const PERMISSION_PRESETS: {
  key: string;
  label: string;
  description: string;
  permissionKeys: PermissionKey[];
}[] = [
  {
    key: 'editor',
    label: 'Editör',
    description: 'Tüm panellere erişebilir, kayıt girer ve düzenler (kullanıcı yönetimi hariç).',
    permissionKeys: [
      'panel.egitim_ekle',
      'panel.kayitlar',
      'panel.rapor',
      'panel.personel',
      'panel.katalog',
      'panel.uyari',
      'kayit.duzenle',
      'uyari.giris',
      'uyari.duzenle',
    ],
  },
  {
    key: 'egitim_giris_sorumlusu',
    label: 'Eğitim Giriş Sorumlusu',
    description:
      'Sadece "Eğitim Ekle" sayfasından eğitim kaydı girer, başka hiçbir panele erişemez.',
    permissionKeys: ['panel.egitim_ekle'],
  },
  {
    key: 'veri_giris_sorumlusu',
    label: 'Veri Giriş Sorumlusu',
    description: 'Eğitim kaydı girer ve "Kayıtlar" panelinde kayıtları görüntüler; düzenleyemez.',
    permissionKeys: ['panel.egitim_ekle', 'panel.kayitlar'],
  },
  {
    key: 'kontrolor',
    label: 'Kontrolör',
    description: 'Sadece rapor görüntüler, hiçbir şeyi değiştiremez.',
    permissionKeys: ['panel.rapor'],
  },
  {
    key: 'personel_giris_sorumlusu',
    label: 'Personel Giriş Sorumlusu',
    description: 'Sadece Personel panelini yönetir.',
    permissionKeys: ['panel.personel'],
  },
  {
    key: 'uyari_egitimi_sorumlusu',
    label: 'Uyarı Eğitimi Sorumlusu',
    description: 'Uyarı Eğitimleri panelinde kayıt girer, düzenler ve disiplin işlemi uygular.',
    permissionKeys: ['panel.uyari', 'uyari.giris', 'uyari.duzenle'],
  },
];

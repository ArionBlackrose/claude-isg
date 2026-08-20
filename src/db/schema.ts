import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, check, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';

export * from './auth-schema';

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const personnel = sqliteTable('personnel', {
  id: id(),
  tcNo: text('tc_no'),
  ad: text('ad').notNull(),
  soyad: text('soyad').notNull(),
  gorev: text('gorev'),
  firma: text('firma'),
  calismaSekli: text('calisma_sekli'),
  dogumTarihi: text('dogum_tarihi'),
  iseGirisTarihi: text('ise_giris_tarihi'),
  cikisTarihi: text('cikis_tarihi'),
  durum: text('durum', { enum: ['Güncel', 'Çıkış'] })
    .notNull()
    .default('Güncel'),
  // Mesleki Yeterlilik Kurumu (MYK) belgesi — personelin varsa yüklediği
  // sertifika dosyasına ait Google Drive referansı.
  mykBelgeDriveFileId: text('myk_belge_drive_file_id'),
  mykBelgeDriveWebViewLink: text('myk_belge_drive_web_view_link'),
  mykBelgeGecerlilikTarihi: text('myk_belge_gecerlilik_tarihi'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const personnelHistory = sqliteTable('personnel_history', {
  id: id(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => personnel.id, { onDelete: 'cascade' }),
  firma: text('firma'),
  gorev: text('gorev'),
  calismaSekli: text('calisma_sekli'),
  girisTarihi: text('giris_tarihi'),
  cikisTarihi: text('cikis_tarihi'),
});

export const training = sqliteTable('training', {
  id: id(),
  ad: text('ad').notNull(),
  kategori: text('kategori', { enum: ['Genel', 'Zorunlu', 'Özel', 'Uyarı', '3. Taraf'] })
    .notNull()
    .default('Genel'),
  gecerlilikAy: integer('gecerlilik_ay').notNull().default(0),
  egitimSuresi: integer('egitim_suresi').notNull().default(0),
  pasaportGoster: integer('pasaport_goster', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: id(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    userName: text('user_name').notNull(),
    action: text('action', { enum: ['create', 'update', 'delete'] }).notNull(),
    entityType: text('entity_type', {
      enum: ['personel', 'egitim', 'kayit', 'kullanici', 'proje'],
    }).notNull(),
    entityId: text('entity_id'),
    entityLabel: text('entity_label').notNull(),
    summary: text('summary').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('audit_log_user_id_idx').on(table.userId),
    index('audit_log_created_at_idx').on(table.createdAt),
  ],
);

/** Haftalık eğitim durumu özet e-postasının gönderim geçmişi — admin
 * panelinde "son gönderilen bildirimler" için kullanılır. */
export const notificationLog = sqliteTable('notification_log', {
  id: id(),
  recipients: text('recipients').notNull(),
  expiredCount: integer('expired_count').notNull().default(0),
  soonCount: integer('soon_count').notNull().default(0),
  sent: integer('sent', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Tek satırlık (singleton) proje bilgisi kaydı — id her zaman 'default'. */
export const projectSettings = sqliteTable(
  'project_settings',
  {
    id: text('id').primaryKey().default('default'),
    projeAdi: text('proje_adi'),
    aciklama: text('aciklama'),
    baslangicTarihi: text('baslangic_tarihi'),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  // Tek satırlık (singleton) tablo: id her zaman 'default' olmak zorunda,
  // böylece yanlışlıkla ikinci bir satır eklenemez.
  (table) => [check('project_settings_singleton', sql`${table.id} = 'default'`)],
);

export const DISCIPLINE_ACTIONS = [
  'Uyarı',
  'Kınama',
  'Ağır Kınama',
  'İşten Çıkarma',
  'Kısıtlı Liste',
] as const;

/** Son 3 ayda 3+ Uyarı eğitimi alan bir personele uygulanan disiplin
 * işlemi — her kayıt bir uygulamayı temsil eder (aynı personel için
 * birden fazla olabilir); dashboard en son kaydı gösterir. */
export const disciplineAction = sqliteTable(
  'discipline_action',
  {
    id: id(),
    personnelId: text('personnel_id')
      .notNull()
      .references(() => personnel.id, { onDelete: 'cascade' }),
    action: text('action', { enum: DISCIPLINE_ACTIONS }).notNull(),
    // İşlemin uygulandığı/geçerli olduğu tarih — kayıt oluşturulma anından
    // (createdAt) farklı olabileceği için ayrıca zorunlu tutulur.
    tarih: text('tarih').notNull().default('1970-01-01'),
    not: text('not'),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('discipline_action_personnel_id_idx').on(table.personnelId)],
);

export const trainingRecord = sqliteTable('training_record', {
  id: id(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => personnel.id, { onDelete: 'cascade' }),
  trainingId: text('training_id')
    .notNull()
    .references(() => training.id, { onDelete: 'cascade' }),
  // Uyarı eğitimleri için: personelin eğitime gönderildiği tarih — kayıt
  // oluşturulurken zorunlu girilir. Genel eğitimlerde bu, eğitimin
  // gerçekleştiği tarihtir.
  tarih: text('tarih').notNull(),
  sonuc: text('sonuc', { enum: ['Başarılı', 'Başarısız', 'Katılmadı', 'Katıldı'] }).notNull(),
  // Uyarı eğitimleri için: personel eğitime fiilen katıldığında zorunlu
  // girilen tarih — `tarih` (gönderilme tarihi) alanından ayrı tutulur.
  // Genel eğitimlerde kullanılmaz.
  katilimTarihi: text('katilim_tarihi'),
  dosyaNo: text('dosya_no'),
  not: text('not'),
  driveFileId: text('drive_file_id'),
  driveWebViewLink: text('drive_web_view_link'),
  createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Admin'in kullanıcı bazında atadığı granüler yetkiler — bugün yalnızca
 * "dış kullanıcı" (Eğitim Pasaportu) hesapları için kullanılır, ama role
 * bağımlı değildir: anahtar kataloğu src/lib/permissions.ts'te tanımlanır,
 * her satır bir (kullanıcı, yetki anahtarı) çiftini temsil eder. Bir
 * kullanıcının yetkisi olmayan her anahtar için hiçbir satır yoktur —
 * "yetki verilmedi" varsayılan durumdur. */
export const userPermission = sqliteTable(
  'user_permission',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('user_permission_user_id_idx').on(table.userId),
    uniqueIndex('user_permission_user_id_key_idx').on(table.userId, table.permissionKey),
  ],
);

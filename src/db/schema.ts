import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
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
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const trainingRecord = sqliteTable('training_record', {
  id: id(),
  personnelId: text('personnel_id')
    .notNull()
    .references(() => personnel.id, { onDelete: 'cascade' }),
  trainingId: text('training_id')
    .notNull()
    .references(() => training.id, { onDelete: 'cascade' }),
  tarih: text('tarih').notNull(),
  sonuc: text('sonuc', { enum: ['Başarılı', 'Başarısız', 'Katılmadı'] }).notNull(),
  not: text('not'),
  driveFileId: text('drive_file_id'),
  driveWebViewLink: text('drive_web_view_link'),
  createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

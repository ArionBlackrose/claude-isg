import type { personnel, training, trainingRecord } from '@/db/schema';
import type { statusFor } from '@/lib/training-status';

// Rapor sadece bu alt kümeyi okur — RSC sınırında (page.tsx -> RaporView)
// gereksiz alanları serileştirip taşımamak için tam satır yerine bilerek dar
// tutulur (bkz. src/app/(app)/rapor/page.tsx'teki eşleşen `db.select({...})`).
export type Personel = Pick<
  typeof personnel.$inferSelect,
  'id' | 'tcNo' | 'ad' | 'soyad' | 'gorev' | 'firma' | 'calismaSekli' | 'durum'
>;
export type Training = Pick<
  typeof training.$inferSelect,
  'id' | 'ad' | 'kategori' | 'gecerlilikAy' | 'egitimSuresi'
>;
export type Rec = Pick<
  typeof trainingRecord.$inferSelect,
  'personnelId' | 'trainingId' | 'tarih' | 'sonuc'
>;

export type PersonelDurumu = ReturnType<typeof statusFor>;

export type DetailView =
  'none' | 'guncelPersonel' | 'cikisPersonel' | 'egitimTuru' | 'kayitlar' | 'durum' | 'adamSaat';

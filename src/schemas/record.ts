import { z } from 'zod';

/** Katılım tarihi, sonuç "Katıldı" olduğunda zorunludur (Uyarı eğitimleri) —
 * aksi halde boş/opsiyonel kalır. Bu kural tüm kayıt şemalarında aynıdır. */
function requireKatilimTarihiWhenKatildi<
  T extends { sonuc: string; katilimTarihi?: string | undefined },
>(data: T, ctx: z.RefinementCtx) {
  if (data.sonuc === 'Katıldı' && !data.katilimTarihi?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Katılım tarihi zorunlu.',
      path: ['katilimTarihi'],
    });
  }
}

export const recordSchema = z
  .object({
    personnelId: z.string().trim().min(1, 'Personel seçimi zorunlu.'),
    trainingId: z.string().trim().min(1, 'Eğitim seçimi zorunlu.'),
    tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
    sonuc: z.enum(['Başarılı', 'Başarısız', 'Katılmadı', 'Katıldı']),
    katilimTarihi: z.string().trim().optional(),
    dosyaNo: z.string().trim().optional(),
    not: z.string().trim().optional(),
  })
  .superRefine(requireKatilimTarihiWhenKatildi);

export type RecordInput = z.infer<typeof recordSchema>;

export const recordUpdateSchema = z
  .object({
    tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
    sonuc: z.enum(['Başarılı', 'Başarısız', 'Katılmadı', 'Katıldı']),
    katilimTarihi: z.string().trim().optional(),
    dosyaNo: z.string().trim().optional(),
    not: z.string().trim().optional(),
  })
  .superRefine(requireKatilimTarihiWhenKatildi);

export type RecordUpdateInput = z.infer<typeof recordUpdateSchema>;

export const recordsBatchSchema = z
  .object({
    personnelIds: z.array(z.string().trim().min(1)).min(1, 'En az bir personel seçin.'),
    trainingIds: z.array(z.string().trim().min(1)).min(1, 'En az bir eğitim seçin.'),
    tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
    sonuc: z.enum(['Başarılı', 'Başarısız', 'Katılmadı', 'Katıldı']),
    katilimTarihi: z.string().trim().optional(),
    dosyaNo: z.string().trim().optional(),
    not: z.string().trim().optional(),
  })
  .superRefine(requireKatilimTarihiWhenKatildi);

export type RecordsBatchInput = z.infer<typeof recordsBatchSchema>;

export const recordExcelRowSchema = z.object({
  tcNo: z.string().trim().optional(),
  adSoyad: z.string().trim().optional(),
  egitimAdi: z.string().trim().min(1),
  tarih: z.string().trim().min(1),
  sonuc: z.string().trim().optional(),
  not: z.string().trim().optional(),
});

export type RecordExcelRow = z.infer<typeof recordExcelRowSchema>;

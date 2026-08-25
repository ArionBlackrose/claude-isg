import { z } from 'zod';

export const recordSchema = z.object({
  personnelId: z.string().trim().min(1, 'Personel seçimi zorunlu.'),
  trainingId: z.string().trim().min(1, 'Eğitim seçimi zorunlu.'),
  tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
  sonuc: z.enum(['Başarılı', 'Başarısız', 'Katılmadı']),
  not: z.string().trim().optional(),
});

export type RecordInput = z.infer<typeof recordSchema>;

export const recordUpdateSchema = z.object({
  tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
  sonuc: z.enum(['Başarılı', 'Başarısız', 'Katılmadı']),
  not: z.string().trim().optional(),
});

export type RecordUpdateInput = z.infer<typeof recordUpdateSchema>;

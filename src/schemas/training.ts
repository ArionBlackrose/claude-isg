import { z } from 'zod';

export const TRAINING_CATEGORIES = [
  'Genel',
  'Zorunlu',
  'Özel',
  'Uyarı',
  '3. Taraf',
  'Saha Eğitimi',
] as const;

export const trainingSchema = z.object({
  ad: z.string().trim().min(1, 'Eğitim adı zorunlu.'),
  kategori: z.enum(TRAINING_CATEGORIES),
  gecerlilikAy: z.number().int().min(0),
  // Ondalık desteklenir (ör. 0.25 saat = 15 dk) — kısa süreli Saha Eğitimi
  // türleri için gerekli, bkz. src/db/schema.ts training.egitimSuresi.
  egitimSuresi: z.number().min(0),
  digerSecenegiVar: z.boolean(),
});

export type TrainingInput = z.infer<typeof trainingSchema>;

export const trainingTopicSchema = z.object({
  trainingId: z.string().trim().min(1, 'Eğitim seçimi zorunlu.'),
  baslik: z.string().trim().min(1, 'Başlık zorunlu.'),
});

export type TrainingTopicInput = z.infer<typeof trainingTopicSchema>;

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
  egitimSuresi: z.number().int().min(0),
});

export type TrainingInput = z.infer<typeof trainingSchema>;

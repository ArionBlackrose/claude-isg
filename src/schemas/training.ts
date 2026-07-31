import { z } from 'zod';

export const trainingSchema = z.object({
  ad: z.string().trim().min(1, 'Eğitim adı zorunlu.'),
  kategori: z
    .string()
    .trim()
    .transform((v) => v || 'Genel'),
  gecerlilikAy: z.number().int().min(0),
});

export type TrainingInput = z.infer<typeof trainingSchema>;

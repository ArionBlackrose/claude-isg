import { z } from 'zod';

export const projectSettingsSchema = z.object({
  projeAdi: z.string().trim().max(200, 'Proje adı en fazla 200 karakter olabilir.').optional(),
  aciklama: z.string().trim().max(2000, 'Açıklama en fazla 2000 karakter olabilir.').optional(),
  baslangicTarihi: z.string().trim().optional(),
});

export type ProjectSettingsInput = z.infer<typeof projectSettingsSchema>;

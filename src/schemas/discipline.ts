import { z } from 'zod';
import { DISCIPLINE_ACTIONS } from '@/db/schema';

export const disciplineActionSchema = z.object({
  personnelId: z.string().trim().min(1, 'Personel seçimi zorunlu.'),
  action: z.enum(DISCIPLINE_ACTIONS, { message: 'Geçerli bir işlem türü seçin.' }),
  tarih: z.string().trim().min(1, 'Tarih zorunlu.'),
  not: z.string().trim().optional(),
});

export type DisciplineActionInput = z.infer<typeof disciplineActionSchema>;

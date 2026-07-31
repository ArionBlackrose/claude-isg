import { z } from 'zod';

export const personnelSchema = z.object({
  tcNo: z.string().trim().optional(),
  ad: z.string().trim().min(1, 'Ad zorunlu.'),
  soyad: z.string().trim().min(1, 'Soyad zorunlu.'),
  gorev: z.string().trim().optional(),
  firma: z.string().trim().optional(),
  calismaSekli: z.string().trim().optional(),
  dogumTarihi: z.string().trim().optional(),
  iseGirisTarihi: z.string().trim().optional(),
});

export type PersonnelInput = z.infer<typeof personnelSchema>;

export const personnelExcelRowSchema = z.object({
  tcNo: z.string().trim().optional(),
  adSoyad: z.string().trim().min(1),
  firma: z.string().trim().optional(),
  gorev: z.string().trim().optional(),
  dogumTarihi: z.string().trim().optional(),
  iseGirisTarihi: z.string().trim().optional(),
});

export type PersonnelExcelRow = z.infer<typeof personnelExcelRowSchema>;

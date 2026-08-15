import { z } from 'zod';
import { isValidTcKimlikNo } from '@/lib/tc-kimlik-no';

const toUpperTr = (v: string) => v.toLocaleUpperCase('tr-TR');

const tcNoField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isValidTcKimlikNo(v), {
    message: 'Geçersiz TC Kimlik No. 11 haneli, geçerli bir kimlik numarası girin.',
  });

function isAtLeast18(dateStr: string): boolean {
  const birth = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const eighteenthBirthday = new Date(birth);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
  return eighteenthBirthday.getTime() <= Date.now();
}

const dogumTarihiField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isAtLeast18(v), {
    message: 'Personel 18 yaşından küçük olamaz.',
  });

function isNotFuture(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
}

const iseGirisTarihiField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isNotFuture(v), {
    message: 'İşe giriş tarihi bugünden ileri bir tarih olamaz.',
  });

export const personnelSchema = z.object({
  tcNo: tcNoField,
  ad: z
    .string()
    .trim()
    .min(1, 'Ad zorunlu.')
    .max(50, 'Ad en fazla 50 karakter olabilir.')
    .transform(toUpperTr),
  soyad: z
    .string()
    .trim()
    .min(1, 'Soyad zorunlu.')
    .max(50, 'Soyad en fazla 50 karakter olabilir.')
    .transform(toUpperTr),
  gorev: z
    .string()
    .trim()
    .max(50, 'Görev en fazla 50 karakter olabilir.')
    .optional()
    .transform((v) => (v ? toUpperTr(v) : v)),
  firma: z
    .string()
    .trim()
    .max(100, 'Firma en fazla 100 karakter olabilir.')
    .optional()
    .transform((v) => (v ? toUpperTr(v) : v)),
  calismaSekli: z.string().trim().optional(),
  dogumTarihi: dogumTarihiField,
  iseGirisTarihi: iseGirisTarihiField,
  durum: z.enum(['Güncel', 'Çıkış']).optional(),
});

/** Form alanlarının (dönüşümden önceki) girdi tipi — react-hook-form için. */
export type PersonnelInput = z.input<typeof personnelSchema>;
/** Doğrulama + büyük harf dönüşümünden sonraki çıktı tipi — server action'lara gönderilen. */
export type PersonnelOutput = z.output<typeof personnelSchema>;

export const personnelExcelRowSchema = z.object({
  tcNo: z.string().trim().optional(),
  adSoyad: z.string().trim().min(1),
  firma: z.string().trim().optional(),
  gorev: z.string().trim().optional(),
  dogumTarihi: z.string().trim().optional(),
  iseGirisTarihi: z.string().trim().optional(),
});

export type PersonnelExcelRow = z.infer<typeof personnelExcelRowSchema>;

import { z } from 'zod';
import { isValidTcKimlikNo } from '@/lib/tc-kimlik-no';
import { toUpperTR as toUpperTr } from '@/lib/utils';
import { isAtLeast18, isNotFuture } from '@/lib/date';

const tcNoField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isValidTcKimlikNo(v), {
    message: 'Geçersiz TC Kimlik No. 11 haneli, geçerli bir kimlik numarası girin.',
  });

const dogumTarihiField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || isAtLeast18(v), {
    message: 'Personel 18 yaşından küçük olamaz.',
  });

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

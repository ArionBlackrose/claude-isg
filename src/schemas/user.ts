import { z } from 'zod';
import { toUpperTR as toUpperTr } from '@/lib/utils';

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ad Soyad zorunlu.')
    .max(50, 'Ad Soyad en fazla 50 karakter olabilir.')
    .transform(toUpperTr),
  email: z.email('Geçerli bir e-posta adresi girin.'),
  role: z.enum(['admin', 'user', 'dis']),
  // Sadece role="dis" için kullanılır — o hesabın Eğitim Pasaportu
  // sorgularını bu firmadaki personelle sınırlar. Personel kayıtlarındaki
  // firma alanıyla aynı normalize edilmiş (büyük harf) biçimde saklanır,
  // böylece searchPassport'taki eşleşme tutarlı olur.
  firma: z
    .string()
    .trim()
    .max(100, 'Firma en fazla 100 karakter olabilir.')
    .optional()
    .transform((v) => (v ? toUpperTr(v) : v)),
});

/** Form alanlarının (dönüşümden önceki) girdi tipi — react-hook-form için. */
export type CreateUserInput = z.input<typeof createUserSchema>;
/** Doğrulama + büyük harf dönüşümünden sonraki çıktı tipi — server action'a gönderilen. */
export type CreateUserOutput = z.output<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ad Soyad zorunlu.')
    .max(50, 'Ad Soyad en fazla 50 karakter olabilir.')
    .transform(toUpperTr),
  email: z.email('Geçerli bir e-posta adresi girin.'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

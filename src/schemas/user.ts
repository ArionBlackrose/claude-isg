import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ad Soyad zorunlu.')
    .max(50, 'Ad Soyad en fazla 50 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.'),
  role: z.enum(['admin', 'user', 'dis']),
  // Sadece role="dis" için kullanılır — o hesabın Eğitim Pasaportu
  // sorgularını bu firmadaki personelle sınırlar.
  firma: z.string().trim().max(100, 'Firma en fazla 100 karakter olabilir.').optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ad Soyad zorunlu.')
    .max(50, 'Ad Soyad en fazla 50 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

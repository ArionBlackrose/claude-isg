import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ad Soyad zorunlu.')
    .max(50, 'Ad Soyad en fazla 50 karakter olabilir.'),
  email: z.email('Geçerli bir e-posta adresi girin.'),
  role: z.enum(['admin', 'user', 'dis']),
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

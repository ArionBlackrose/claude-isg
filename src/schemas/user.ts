import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Ad Soyad zorunlu.'),
  email: z.email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
  role: z.enum(['admin', 'user']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

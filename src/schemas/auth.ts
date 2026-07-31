import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

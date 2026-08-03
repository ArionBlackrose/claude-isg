import { z } from 'zod';

export const requestCodeSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.'),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;

export const verifyCodeSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, '6 haneli kodu girin.'),
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendOtpEmail } from '@/lib/mail';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 gün
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        input: false,
      },
      // Sadece "dis" (Eğitim Pasaportu dış kullanıcısı) hesapları için
      // anlamlı — sorguları bu firmayla sınırlamak için searchPassport
      // tarafından okunuyor.
      firma: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 dakika
      storeOTP: 'hashed',
      // Kullanıcılar sadece admin tarafından oluşturulur — bilinmeyen bir
      // e-posta ile kod istenirse otomatik hesap açılmaz.
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === 'sign-in') {
          await sendOtpEmail(email, otp);
        }
      },
    }),
  ],
});

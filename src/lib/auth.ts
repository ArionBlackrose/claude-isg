import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { after } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sendOtpEmail } from '@/lib/mail';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  advanced: {
    // better-auth varsayılan olarak sendVerificationOTP callback'ini (e-posta
    // gönderimini) isteğin kritik yolunda await'liyor — yani "Kod Gönder"
    // butonu, Resend'e giden ağ isteği tamamlanana kadar bekliyor. Next.js'in
    // after() ile bunu yanıt gönderildikten SONRA arka planda çalıştırıyoruz.
    backgroundTasks: {
      handler: after,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 gün
    // Her requireSession()/requireAdmin() çağrısında DB'ye gitmemek için oturumu
    // kısa süreliğine imzalı çerezde önbelleğe alıyoruz. 60 saniye, rol değişikliği
    // gibi RBAC-kritik güncellemelerin en geç bir dakika içinde etkili olmasını
    // garanti ederken DB yükünü büyük ölçüde azaltıyor.
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
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
      permissionsConfigured: {
        type: 'boolean',
        defaultValue: false,
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

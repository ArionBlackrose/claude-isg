import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { auth } from './auth';

// GEÇİCİ: E-posta kodu ile giriş askıya alındı, tüm istekler otomatik
// olarak ilk admin kullanıcı olarak oturum açmış sayılıyor. Gerçek girişi
// geri açmak için bu satırı false yapmak yeterli.
// GÜVENLİK: production'da (NODE_ENV === 'production') bu bayrak ne olursa
// olsun asla etkili olmaz — yanlışlıkla canlıya bu haliyle deploy edilse bile
// gerçek kimlik doğrulama devrede kalır.
const LOGIN_DISABLED_TEMPORARILY = process.env.NODE_ENV !== 'production' && true;

async function bypassSession() {
  const [admin] = await db.select().from(user).where(eq(user.role, 'admin')).limit(1);
  const devUser = admin ?? (await db.select().from(user).limit(1))[0];
  if (!devUser) return null;
  return {
    user: { id: devUser.id, name: devUser.name, email: devUser.email, role: devUser.role },
    session: { id: 'dev-bypass', userId: devUser.id },
  };
}

// Aynı istek (sayfa/layout render zinciri) içinde birden fazla yerden
// çağrılsa da (root layout, admin layout, sayfanın kendisi vb.) oturum
// sorgusu sadece BİR kez çalışır — React'in istek-kapsamlı cache()'i ile
// tekrar eden DB/cookie sorgularının önüne geçilir (menüler arası geçişte
// gereksiz gecikmenin ana kaynağı buydu).
export const getSession = cache(async () => {
  if (LOGIN_DISABLED_TEMPORARILY) {
    const bypassed = await bypassSession();
    if (bypassed) return bypassed as Awaited<ReturnType<typeof auth.api.getSession>>;
  }
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== 'admin') redirect('/');
  return session;
}

// Personel ve eğitim türü silme geri alınamaz işlemler olduğu için
// (kayıtlar ve geçmiş dönemler de birlikte silinir) tam yetkili adminler
// arasında bile sadece bu iki hesapla sınırlandırıldı.
const DESTRUCTIVE_DELETE_ALLOWED_EMAILS = ['xechto@gmail.com', 'sethblackrose@gmail.com'];

export function canDeletePersonnel(email: string): boolean {
  return DESTRUCTIVE_DELETE_ALLOWED_EMAILS.includes(email);
}

export function canDeleteTraining(email: string): boolean {
  return DESTRUCTIVE_DELETE_ALLOWED_EMAILS.includes(email);
}

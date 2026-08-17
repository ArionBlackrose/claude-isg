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

export async function getSession() {
  if (LOGIN_DISABLED_TEMPORARILY) {
    const bypassed = await bypassSession();
    if (bypassed) return bypassed as Awaited<ReturnType<typeof auth.api.getSession>>;
  }
  return auth.api.getSession({ headers: await headers() });
}

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

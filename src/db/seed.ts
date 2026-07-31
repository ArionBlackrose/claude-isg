import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';
import { db } from './index';
import { user } from './auth-schema';

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Sistem Yöneticisi';

  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD .env dosyasında tanımlı olmalı.');
    process.exit(1);
  }

  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) {
    console.log(`"${email}" zaten kayıtlı, admin rolü doğrulanıyor.`);
    if (existing.role !== 'admin') {
      await db.update(user).set({ role: 'admin' }).where(eq(user.id, existing.id));
      console.log('Rol "admin" olarak güncellendi.');
    }
    return;
  }

  const result = await auth.api.signUpEmail({ body: { email, password, name } });
  await db.update(user).set({ role: 'admin' }).where(eq(user.id, result.user.id));
  console.log(`İlk admin kullanıcısı oluşturuldu: ${email}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed hatası:', err);
    process.exit(1);
  });

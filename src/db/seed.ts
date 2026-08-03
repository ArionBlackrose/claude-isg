import { eq } from 'drizzle-orm';
import { db } from './index';
import { user } from './auth-schema';

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME ?? 'Sistem Yöneticisi';

  if (!email) {
    console.error('SEED_ADMIN_EMAIL .env dosyasında tanımlı olmalı.');
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

  await db.insert(user).values({
    id: crypto.randomUUID(),
    name,
    email,
    emailVerified: true,
    role: 'admin',
  });
  console.log(
    `İlk admin kullanıcısı oluşturuldu: ${email} — şifre yok, giriş yaparken e-postaya gönderilen 6 haneli kodu kullanın.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed hatası:', err);
    process.exit(1);
  });

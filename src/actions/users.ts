'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { user } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { logActivity, diffSummary } from '@/lib/audit';
import { createUserSchema, updateUserSchema } from '@/schemas/user';
import type { ActionResult } from './training';

async function findEmailConflict(email: string, excludeId?: string) {
  const matches = await db.select().from(user).where(eq(user.email, email));
  return matches.find((u) => u.id !== excludeId) ?? null;
}

export async function createUser(input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const conflict = await findEmailConflict(parsed.data.email);
  if (conflict) {
    return { ok: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.' };
  }

  const [inserted] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email,
      emailVerified: true,
      role: parsed.data.role,
    })
    .returning();

  revalidatePath('/admin/kullanicilar');
  await logActivity(
    session,
    'create',
    'kullanici',
    inserted.id,
    inserted.name,
    `Kullanıcı eklendi (${inserted.email}, rol: ${inserted.role}).`,
  );
  return { ok: true };
}

export async function updateUser(userId: string, input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const conflict = await findEmailConflict(parsed.data.email, userId);
  if (conflict) {
    return { ok: false, error: 'Bu e-posta adresiyle kayıtlı başka bir kullanıcı var.' };
  }

  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }

  await db
    .update(user)
    .set({ name: parsed.data.name, email: parsed.data.email })
    .where(eq(user.id, userId));
  revalidatePath('/admin/kullanicilar');

  const summary = diffSummary(existing, parsed.data, { name: 'Ad Soyad', email: 'E-posta' });
  await logActivity(session, 'update', 'kullanici', userId, parsed.data.name, summary);
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'user' | 'dis',
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { ok: false, error: 'Kendi rolünüzü değiştiremezsiniz.' };
  }
  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  await db.update(user).set({ role }).where(eq(user.id, userId));
  revalidatePath('/admin/kullanicilar');
  if (existing) {
    await logActivity(
      session,
      'update',
      'kullanici',
      userId,
      existing.name,
      `Rol: "${existing.role}" → "${role}".`,
    );
  }
  return { ok: true };
}

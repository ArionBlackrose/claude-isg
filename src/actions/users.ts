'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { user } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { createUserSchema, updateUserSchema } from '@/schemas/user';
import type { ActionResult } from './training';

async function findEmailConflict(email: string, excludeId?: string) {
  const matches = await db.select().from(user).where(eq(user.email, email));
  return matches.find((u) => u.id !== excludeId) ?? null;
}

export async function createUser(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const conflict = await findEmailConflict(parsed.data.email);
  if (conflict) {
    return { ok: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.' };
  }

  await db.insert(user).values({
    id: crypto.randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    emailVerified: true,
    role: parsed.data.role,
  });

  revalidatePath('/admin/kullanicilar');
  return { ok: true };
}

export async function updateUser(userId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const conflict = await findEmailConflict(parsed.data.email, userId);
  if (conflict) {
    return { ok: false, error: 'Bu e-posta adresiyle kayıtlı başka bir kullanıcı var.' };
  }

  await db
    .update(user)
    .set({ name: parsed.data.name, email: parsed.data.email })
    .where(eq(user.id, userId));
  revalidatePath('/admin/kullanicilar');
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'user',
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { ok: false, error: 'Kendi rolünüzü değiştiremezsiniz.' };
  }
  await db.update(user).set({ role }).where(eq(user.id, userId));
  revalidatePath('/admin/kullanicilar');
  return { ok: true };
}

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { user } from '@/db/schema';
import { auth } from '@/lib/auth';
import { requireAdmin } from '@/lib/session';
import { createUserSchema } from '@/schemas/user';
import type { ActionResult } from './training';

export async function createUser(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
      },
    });
    if (parsed.data.role === 'admin') {
      await db.update(user).set({ role: 'admin' }).where(eq(user.id, result.user.id));
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı.',
    };
  }

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

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { training, trainingRecord } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { trainingSchema } from '@/schemas/training';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function createTraining(input: unknown): Promise<CreateResult> {
  await requireAdmin();
  const parsed = trainingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const [inserted] = await db.insert(training).values(parsed.data).returning();
  revalidatePath('/katalog');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  return { ok: true, id: inserted.id };
}

export async function updateTraining(id: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = trainingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  await db.update(training).set(parsed.data).where(eq(training.id, id));
  revalidatePath('/katalog');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  return { ok: true };
}

export async function deleteTraining(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.delete(trainingRecord).where(eq(trainingRecord.trainingId, id));
  await db.delete(training).where(eq(training.id, id));
  revalidatePath('/katalog');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  return { ok: true };
}

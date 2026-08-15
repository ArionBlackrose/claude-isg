'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { training, trainingRecord } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { logActivity, diffSummary } from '@/lib/audit';
import { trainingSchema } from '@/schemas/training';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export async function createTraining(input: unknown): Promise<CreateResult> {
  const session = await requireAdmin();
  const parsed = trainingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const [inserted] = await db.insert(training).values(parsed.data).returning();
  revalidatePath('/katalog');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  await logActivity(
    session,
    'create',
    'egitim',
    inserted.id,
    inserted.ad,
    `Eğitim türü eklendi (${inserted.kategori}).`,
  );
  return { ok: true, id: inserted.id };
}

export async function updateTraining(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = trainingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const [existing] = await db.select().from(training).where(eq(training.id, id));
  if (!existing) {
    return { ok: false, error: 'Eğitim türü bulunamadı.' };
  }
  await db.update(training).set(parsed.data).where(eq(training.id, id));
  revalidatePath('/katalog');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  const summary = diffSummary(existing, parsed.data, {
    ad: 'Eğitim Adı',
    kategori: 'Kategori',
    gecerlilikAy: 'Geçerlilik (ay)',
    egitimSuresi: 'Süre (saat)',
  });
  await logActivity(session, 'update', 'egitim', id, parsed.data.ad, summary);
  return { ok: true };
}

export async function deleteTraining(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const [existing] = await db.select().from(training).where(eq(training.id, id));
  await db.delete(trainingRecord).where(eq(trainingRecord.trainingId, id));
  await db.delete(training).where(eq(training.id, id));
  revalidatePath('/katalog');
  revalidatePath('/');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  if (existing) {
    await logActivity(
      session,
      'delete',
      'egitim',
      id,
      existing.ad,
      'Eğitim türü ve bağlı tüm kayıtlar silindi.',
    );
  }
  return { ok: true };
}

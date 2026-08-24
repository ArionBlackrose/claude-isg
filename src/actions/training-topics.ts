'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { training, trainingTopic } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { toUpperTR } from '@/lib/utils';
import { trainingTopicSchema } from '@/schemas/training';
import type { ActionResult, CreateResult } from './training';

/** Sadece "Saha Eğitimi" kategorisindeki bir eğitim türü için başlık
 * eklenebilir — admin Eğitim Kataloğu'ndan başka bir kategoriye başlık
 * eklemeye çalışırsa (ör. hatalı bir istekle) reddedilir. */
export async function addTrainingTopic(input: unknown): Promise<CreateResult> {
  const session = await requireAdmin();
  const parsed = trainingTopicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const [t] = await db.select().from(training).where(eq(training.id, parsed.data.trainingId));
  if (!t) {
    return { ok: false, error: 'Eğitim türü bulunamadı.' };
  }
  if (t.kategori !== 'Saha Eğitimi') {
    return {
      ok: false,
      error: 'Başlık sadece Saha Eğitimi kategorisindeki eğitimlere eklenebilir.',
    };
  }
  const baslik = toUpperTR(parsed.data.baslik);
  const [inserted] = await db
    .insert(trainingTopic)
    .values({ trainingId: parsed.data.trainingId, baslik })
    .returning();
  revalidatePath('/katalog');
  revalidatePath('/saha-egitimi');
  await logActivity(
    session,
    'create',
    'egitim',
    inserted.id,
    `${t.ad} — ${baslik}`,
    'Saha eğitimi başlığı eklendi.',
  );
  return { ok: true, id: inserted.id };
}

export async function deleteTrainingTopic(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const [existing] = await db.select().from(trainingTopic).where(eq(trainingTopic.id, id));
  await db.delete(trainingTopic).where(eq(trainingTopic.id, id));
  revalidatePath('/katalog');
  revalidatePath('/saha-egitimi');
  if (existing) {
    await logActivity(
      session,
      'delete',
      'egitim',
      id,
      existing.baslik,
      'Saha eğitimi başlığı silindi.',
    );
  }
  return { ok: true };
}

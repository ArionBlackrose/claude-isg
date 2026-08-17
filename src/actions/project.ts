'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { projectSettings } from '@/db/schema';
import { requireAdmin, requireSession } from '@/lib/session';
import { logActivity, diffSummary } from '@/lib/audit';
import { projectSettingsSchema } from '@/schemas/project';
import type { ActionResult } from './training';

const SETTINGS_ID = 'default';

export type ProjectSettings = {
  projeAdi: string | null;
  aciklama: string | null;
  baslangicTarihi: string | null;
};

/** Herhangi bir oturum açmış kullanıcı okuyabilir (Rapor sayfası için). */
export async function getProjectSettings(): Promise<ProjectSettings> {
  await requireSession();
  const [row] = await db.select().from(projectSettings).where(eq(projectSettings.id, SETTINGS_ID));
  return {
    projeAdi: row?.projeAdi ?? null,
    aciklama: row?.aciklama ?? null,
    baslangicTarihi: row?.baslangicTarihi ?? null,
  };
}

export async function updateProjectSettings(input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = projectSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const [existing] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.id, SETTINGS_ID));

  const next = {
    projeAdi: parsed.data.projeAdi || null,
    aciklama: parsed.data.aciklama || null,
    baslangicTarihi: parsed.data.baslangicTarihi || null,
  };

  if (existing) {
    await db.update(projectSettings).set(next).where(eq(projectSettings.id, SETTINGS_ID));
  } else {
    await db.insert(projectSettings).values({ id: SETTINGS_ID, ...next });
  }

  revalidatePath('/admin/proje');
  revalidatePath('/rapor');

  const summary = diffSummary(
    existing ?? { projeAdi: null, aciklama: null, baslangicTarihi: null },
    next,
    {
      projeAdi: 'Proje Adı',
      aciklama: 'Açıklama',
      baslangicTarihi: 'Başlangıç Tarihi',
    },
  );
  await logActivity(
    session,
    'update',
    'proje',
    SETTINGS_ID,
    next.projeAdi || 'Proje Bilgileri',
    summary,
  );

  return { ok: true };
}

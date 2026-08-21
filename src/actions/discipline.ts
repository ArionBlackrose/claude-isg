'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { disciplineAction, personnel } from '@/db/schema';
import { hasPermission, requirePanelAccess } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { disciplineActionSchema } from '@/schemas/discipline';
import type { ActionResult } from './training';

// Disiplin işlemi (Kınama/Ağır Kınama/İşten Çıkarma) geri alınamaz bir
// personel işlemi olduğundan panel erişimi (panel.uyari) tek başına yeterli
// değil — "Uyarı Eğitimi Sorumlusu" preset'inin kendi açıklamasında vaat
// ettiği gibi uyari.duzenle yetkisi de aranır; aksi halde sadece
// görüntüleme yetkisi olan bir hesap da disiplin işlemi uygulayabilirdi.
export async function applyDisciplineAction(input: unknown): Promise<ActionResult> {
  const session = await requirePanelAccess('panel.uyari');
  if (!(await hasPermission(session, 'uyari.duzenle'))) {
    return { ok: false, error: 'Disiplin işlemi uygulama yetkiniz yok.' };
  }
  const parsed = disciplineActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const [person] = await db
    .select()
    .from(personnel)
    .where(eq(personnel.id, parsed.data.personnelId));
  if (!person) {
    return { ok: false, error: 'Personel bulunamadı.' };
  }

  await db.insert(disciplineAction).values({
    personnelId: parsed.data.personnelId,
    action: parsed.data.action,
    tarih: parsed.data.tarih,
    not: parsed.data.not || null,
    createdByUserId: session.user.id,
  });

  await logActivity(
    session,
    'create',
    'personel',
    person.id,
    `${person.ad} ${person.soyad}`,
    `Disiplin işlemi uygulandı: ${parsed.data.action} (${parsed.data.tarih})${parsed.data.not ? ` — ${parsed.data.not}` : ''}`,
  );

  revalidatePath('/uyari');
  revalidatePath('/personel');
  return { ok: true };
}

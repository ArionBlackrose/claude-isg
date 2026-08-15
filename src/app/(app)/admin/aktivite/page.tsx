import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { AktiviteTable } from '@/components/admin/aktivite-table';

const MAX_ROWS = 1000;

export default async function AktivitePage() {
  await requireAdmin();
  const logs = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(MAX_ROWS);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Aktivite Günlüğü
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Sistemdeki tüm ekleme/güncelleme/silme işlemleri ve kullanıcı bazında özet — veri girişi
          performans değerlendirmesi için. Bu sayfayı yalnızca yöneticiler görebilir.
        </p>
        <AktiviteTable
          logs={logs.map((l) => ({
            id: l.id,
            userName: l.userName,
            action: l.action,
            entityType: l.entityType,
            entityLabel: l.entityLabel,
            summary: l.summary,
            createdAt: l.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}

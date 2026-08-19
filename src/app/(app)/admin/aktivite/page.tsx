import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { auditLog, notificationLog } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { AktiviteTable } from '@/components/admin/aktivite-table';
import { getLastBackupInfo } from '@/lib/backup';

const MAX_ROWS = 1000;
const MAX_NOTIFICATION_ROWS = 10;

function fmtDateTime(d: Date) {
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AktivitePage() {
  await requireAdmin();
  const [logs, notifications] = await Promise.all([
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(MAX_ROWS),
    db
      .select()
      .from(notificationLog)
      .orderBy(desc(notificationLog.createdAt))
      .limit(MAX_NOTIFICATION_ROWS),
  ]);
  const lastBackup = getLastBackupInfo();

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Sistem Durumu
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Otomatik günlük veritabanı yedeği ve haftalık eğitim durumu bildirim e-postasının son
          çalışma geçmişi.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Son Veritabanı Yedeği
            </h3>
            {lastBackup ? (
              <p className="text-sm">
                <span className="font-mono">{fmtDateTime(lastBackup.createdAt)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({lastBackup.count} yedek dosyası saklanıyor)
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz yedek alınmadı.</p>
            )}
          </div>
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Son Eğitim Durumu Bildirimi
            </h3>
            {notifications.length ? (
              <p className="text-sm">
                <span className="font-mono">{fmtDateTime(notifications[0].createdAt)}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {notifications[0].sent
                    ? `(${notifications[0].expiredCount} süresi dolmuş, ${notifications[0].soonCount} yaklaşan — ${notifications[0].recipients} adreslerine gönderildi)`
                    : '(bildirilecek bir şey yoktu, e-posta gönderilmedi)'}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz bildirim kontrolü yapılmadı.</p>
            )}
          </div>
        </div>
        {notifications.length > 1 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Bildirim Geçmişi
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {notifications.slice(1).map((n) => (
                <li key={n.id}>
                  {fmtDateTime(n.createdAt)} —{' '}
                  {n.sent
                    ? `${n.expiredCount} süresi dolmuş, ${n.soonCount} yaklaşan gönderildi`
                    : 'bildirilecek bir şey yoktu'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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

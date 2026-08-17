import { db } from '@/db';
import { auditLog } from '@/db/schema';

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'personel' | 'egitim' | 'kayit' | 'kullanici' | 'proje';

type ActorSession = { user: { id: string; name: string } };

export async function logActivity(
  session: ActorSession,
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string | null,
  entityLabel: string,
  summary: string,
): Promise<void> {
  await db.insert(auditLog).values({
    userId: session.user.id,
    userName: session.user.name,
    action,
    entityType,
    entityId,
    entityLabel,
    summary,
  });
}

/** İki nesne arasında değişen alanları "alan: eski → yeni" biçiminde özetler. */
export function diffSummary<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  labels: Partial<Record<keyof T, string>>,
): string {
  const parts: string[] = [];
  for (const key of Object.keys(labels) as (keyof T)[]) {
    const oldValue = before[key] ?? '-';
    const newValue = key in after ? (after[key] ?? '-') : oldValue;
    if (String(oldValue) !== String(newValue)) {
      parts.push(`${labels[key]}: "${oldValue}" → "${newValue}"`);
    }
  }
  return parts.length ? parts.join(', ') : 'Değişiklik yok.';
}

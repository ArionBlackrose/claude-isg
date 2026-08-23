'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/session';
import { canFactoryReset } from '@/lib/permissions';
import { logActivity } from '@/lib/audit';
import { runManualBackup } from '@/lib/backup';
import {
  FACTORY_RESET_CONFIRMATION_PHRASE,
  isValidResetCategoryKey,
  runFactoryReset,
  type FactoryResetSummary,
  RESET_CATEGORIES,
} from '@/lib/factory-reset';

export type FactoryResetResult =
  { ok: true; summary: FactoryResetSummary } | { ok: false; error: string };

/** Seçilen veri kategorilerini kalıcı olarak siler — sistemi yeni bir
 * şantiye/firma için yeniden kullanıma hazırlamak amacıyla. Geri alınamaz;
 * bu yüzden (1) sadece whitelist'teki iki hesapla, (2) tam onay metni
 * doğru yazılmadan, (3) silmeden hemen önce zorunlu bir yedek alınmadan
 * ÇALIŞMAZ — yedek alma başarısız olursa işlem tamamen durur. */
export async function factoryReset(
  categoryKeys: string[],
  confirmationText: string,
): Promise<FactoryResetResult> {
  const session = await requireAdmin();
  if (!canFactoryReset(session.user.email)) {
    return { ok: false, error: 'Sistem sıfırlama yetkiniz yok.' };
  }
  if (confirmationText.trim() !== FACTORY_RESET_CONFIRMATION_PHRASE) {
    return { ok: false, error: 'Onay metni hatalı. İşlem uygulanmadı.' };
  }
  const uniqueKeys = Array.from(new Set(categoryKeys));
  const validKeys = uniqueKeys.filter(isValidResetCategoryKey);
  if (!validKeys.length) {
    return { ok: false, error: 'En az bir veri kategorisi seçilmeli.' };
  }

  try {
    await runManualBackup();
  } catch (err) {
    return {
      ok: false,
      error: `Sıfırlama öncesi yedek alınamadı, işlem güvenlik nedeniyle durduruldu: ${
        err instanceof Error ? err.message : 'bilinmeyen hata'
      }`,
    };
  }

  let summary: FactoryResetSummary;
  try {
    summary = await runFactoryReset(validKeys, session.user.id);
  } catch (err) {
    // runFactoryReset artık Drive silme işlemini transaction BAŞARILI
    // olduktan sonra yapıyor (bkz. factory-reset.ts) — yani buraya
    // düşülüyorsa veritabanı transaction'ı geri alınmıştır (rollback) ve
    // hiçbir Drive dosyası silinmemiştir; sistem sıfırlama öncesi duruma
    // tutarlı şekilde geri döner, sadece admin'e bilgilendirici bir hata
    // gösterilir.
    return {
      ok: false,
      error: `Sıfırlama başarısız oldu, hiçbir değişiklik uygulanmadı: ${
        err instanceof Error ? err.message : 'bilinmeyen hata'
      }`,
    };
  }

  const labelByKey = new Map(RESET_CATEGORIES.map((c) => [c.key, c.label]));
  const countsText = Object.entries(summary.counts)
    .map(([key, count]) => `${labelByKey.get(key as (typeof validKeys)[number]) ?? key}: ${count}`)
    .join(', ');
  const warningsText = summary.driveWarnings.length
    ? ` (${summary.driveWarnings.length} Drive dosyası silinemedi.)`
    : '';
  await logActivity(
    session,
    'delete',
    'proje',
    null,
    'Sistem Sıfırlama',
    `Fabrika ayarlarına dönüldü — ${countsText}.${warningsText}`,
  );

  revalidatePath('/', 'layout');
  return { ok: true, summary };
}

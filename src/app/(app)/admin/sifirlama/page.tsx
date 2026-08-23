import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/session';
import { canFactoryReset } from '@/lib/permissions';
import { getLastBackupInfo } from '@/lib/backup';
import { FactoryResetForm } from '@/components/admin/factory-reset-form';

export const metadata: Metadata = { title: 'Sistem Sıfırlama' };

export default async function SistemSifirlamaPage() {
  const session = await requireAdmin();
  const canReset = canFactoryReset(session.user.email);
  const lastBackup = getLastBackupInfo();

  return (
    <div className="rounded-lg border border-border bg-panel p-5">
      <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
        Sistem Sıfırlama
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Sistemi yeni bir şantiye/firma için yeniden kullanıma hazırlamak amacıyla, program yapısı
        (hesaplar hariç) aynı kalır, seçtiğiniz veri kategorileri kalıcı olarak silinir. Bu işlem
        geri alınamaz.
      </p>
      {canReset ? (
        <FactoryResetForm lastBackup={lastBackup} />
      ) : (
        <p className="rounded-lg border border-border bg-panel-2 p-4 text-sm text-muted-foreground">
          Bu bölüme erişim yetkiniz yok — sistem sıfırlama sadece belirli yönetici hesaplarıyla
          sınırlıdır.
        </p>
      )}
    </div>
  );
}

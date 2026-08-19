import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  deletePersonnelMykBelgesi,
  setMykBelgeGecerlilikTarihi,
  uploadPersonnelMykBelgesi,
} from '@/actions/personnel';
import { useConfirm } from '@/hooks/use-confirm';

/** MYK belgesi yükleme/kaldırma işlemlerini tek bir personel için yönetir.
 * personel-table.tsx ve personel-detay-dialog.tsx tarafından ortak kullanılır. */
export function useMykBelgesi(personnelId: string) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  async function upload(file: File) {
    setIsPending(true);
    const formData = new FormData();
    formData.set('file', file);
    const result = await uploadPersonnelMykBelgesi(personnelId, formData);
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('MYK belgesi yüklendi.');
    router.refresh();
  }

  async function remove() {
    if (
      !(await confirm({
        description: 'MYK belgesini kaldırmak istediğinize emin misiniz?',
        confirmLabel: 'Kaldır',
        destructive: true,
      }))
    )
      return;
    setIsPending(true);
    const result = await deletePersonnelMykBelgesi(personnelId);
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('MYK belgesi kaldırıldı.');
    router.refresh();
  }

  async function setGecerlilikTarihi(tarih: string | null) {
    setIsPending(true);
    const result = await setMykBelgeGecerlilikTarihi(personnelId, tarih);
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('MYK belgesi geçerlilik tarihi güncellendi.');
    router.refresh();
  }

  return { isPending, upload, remove, setGecerlilikTarihi, ConfirmDialog };
}

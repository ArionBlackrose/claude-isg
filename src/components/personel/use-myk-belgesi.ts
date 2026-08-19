import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deletePersonnelMykBelgesi, uploadPersonnelMykBelgesi } from '@/actions/personnel';

/** MYK belgesi yükleme/kaldırma işlemlerini tek bir personel için yönetir.
 * personel-table.tsx ve personel-detay-dialog.tsx tarafından ortak kullanılır. */
export function useMykBelgesi(personnelId: string) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

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
    if (!window.confirm('MYK belgesini kaldırmak istediğinize emin misiniz?')) return;
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

  return { isPending, upload, remove };
}

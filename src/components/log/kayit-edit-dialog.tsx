'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createRecord, deleteRecord, updateRecord } from '@/actions/records';
import type { LogRecord } from './log-table';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function KayitEditDialog({
  open,
  onOpenChange,
  personnelId,
  trainingId,
  personName,
  trainingName,
  records,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  trainingId: string;
  personName: string;
  trainingName: string;
  records: LogRecord[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { tarih: string; sonuc: string; not: string }>
  >({});
  const [newTarih, setNewTarih] = useState(todayStr());
  const [newSonuc, setNewSonuc] = useState<'Başarılı' | 'Başarısız' | 'Katılmadı'>('Başarılı');
  const [newNot, setNewNot] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  function draftFor(r: LogRecord) {
    return drafts[r.id] ?? { tarih: r.tarih, sonuc: r.sonuc, not: r.not ?? '' };
  }

  async function handleSave(r: LogRecord) {
    const draft = draftFor(r);
    setPendingId(r.id);
    const result = await updateRecord(r.id, draft);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Güncellendi.');
    router.refresh();
  }

  async function handleDelete(r: LogRecord) {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'))
      return;
    setPendingId(r.id);
    const result = await deleteRecord(r.id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Silindi.');
    router.refresh();
  }

  async function handleAdd() {
    if (!newTarih) {
      toast.error('Tarih zorunlu.');
      return;
    }
    setIsAdding(true);
    const result = await createRecord({
      personnelId,
      trainingId,
      tarih: newTarih,
      sonuc: newSonuc,
      not: newNot,
    });
    setIsAdding(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Eklendi.');
    setNewNot('');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {personName} — {trainingName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!records.length && (
            <p className="text-sm text-muted-foreground">Bu eğitim için henüz kayıt yok.</p>
          )}
          {records
            .slice()
            .sort((a, b) => b.tarih.localeCompare(a.tarih))
            .map((r) => {
              const draft = draftFor(r);
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-1 items-end gap-2 border-b border-border pb-3 sm:grid-cols-[1fr_1fr_2fr_auto_auto]"
                >
                  <div className="space-y-1">
                    <Label>Tarih</Label>
                    <Input
                      type="date"
                      value={draft.tarih}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r.id]: { ...draft, tarih: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Sonuç</Label>
                    <Select
                      value={draft.sonuc}
                      onValueChange={(v) =>
                        setDrafts((d) => ({ ...d, [r.id]: { ...draft, sonuc: v ?? draft.sonuc } }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Başarılı">Başarılı</SelectItem>
                        <SelectItem value="Başarısız">Başarısız</SelectItem>
                        <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Not</Label>
                    <Input
                      value={draft.not}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r.id]: { ...draft, not: e.target.value } }))
                      }
                    />
                  </div>
                  <Button size="sm" disabled={pendingId === r.id} onClick={() => handleSave(r)}>
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-danger text-danger hover:bg-danger/10"
                    disabled={pendingId === r.id}
                    onClick={() => handleDelete(r)}
                  >
                    Sil
                  </Button>
                </div>
              );
            })}

          <div className="pt-1">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">+ Yeni Kayıt Ekle</p>
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <div className="space-y-1">
                <Label>Tarih</Label>
                <Input type="date" value={newTarih} onChange={(e) => setNewTarih(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Sonuç</Label>
                <Select
                  value={newSonuc}
                  onValueChange={(v) => setNewSonuc((v as typeof newSonuc) ?? 'Başarılı')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Başarılı">Başarılı</SelectItem>
                    <SelectItem value="Başarısız">Başarısız</SelectItem>
                    <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Not</Label>
                <Input
                  value={newNot}
                  onChange={(e) => setNewNot(e.target.value)}
                  placeholder="opsiyonel"
                />
              </div>
              <Button size="sm" disabled={isAdding} onClick={handleAdd}>
                Ekle
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

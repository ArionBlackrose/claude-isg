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
import {
  createRecord,
  deleteRecord,
  updateRecord,
  uploadRecordCertificate,
} from '@/actions/records';
import { todayStr } from '@/lib/training-status';
import type { LogRecord } from './log-table';

export function KayitEditDialog({
  open,
  onOpenChange,
  personnelId,
  trainingId,
  personName,
  trainingName,
  records,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  trainingId: string;
  personName: string;
  trainingName: string;
  records: LogRecord[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { tarih: string; sonuc: string; dosyaNo: string; not: string }>
  >({});
  const [newTarih, setNewTarih] = useState(todayStr());
  const [newSonuc, setNewSonuc] = useState<'Başarılı' | 'Başarısız' | 'Katılmadı'>('Başarılı');
  const [newDosyaNo, setNewDosyaNo] = useState('');
  const [newNot, setNewNot] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  function draftFor(r: LogRecord) {
    return (
      drafts[r.id] ?? { tarih: r.tarih, sonuc: r.sonuc, dosyaNo: r.dosyaNo ?? '', not: r.not ?? '' }
    );
  }

  async function handleSave(r: LogRecord) {
    const draft = draftFor(r);
    if (!draft.dosyaNo.trim()) {
      toast.error('Dosya No zorunlu.');
      return;
    }
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

  async function handleCertificateUpload(r: LogRecord, file: File) {
    setPendingId(r.id);
    const formData = new FormData();
    formData.set('file', file);
    const result = await uploadRecordCertificate(r.id, formData);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Sertifika yüklendi.');
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
    if (!newDosyaNo.trim()) {
      toast.error('Dosya No zorunlu.');
      return;
    }
    setIsAdding(true);
    const result = await createRecord({
      personnelId,
      trainingId,
      tarih: newTarih,
      sonuc: newSonuc,
      dosyaNo: newDosyaNo,
      not: newNot,
    });
    setIsAdding(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Eklendi.');
    setNewDosyaNo('');
    setNewNot('');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
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
                  className="grid grid-cols-1 items-end gap-2 border-b border-border pb-3 sm:grid-cols-[1fr_1fr_1fr_1.4fr_auto_auto]"
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
                    <Label>
                      Dosya No<span className="text-danger"> *</span>
                    </Label>
                    <Input
                      value={draft.dosyaNo}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [r.id]: { ...draft, dosyaNo: e.target.value } }))
                      }
                    />
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
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-danger text-danger hover:bg-danger/10"
                      disabled={pendingId === r.id}
                      onClick={() => handleDelete(r)}
                    >
                      Sil
                    </Button>
                  )}
                  <div className="col-span-full flex items-center gap-2.5 text-xs">
                    {r.driveWebViewLink ? (
                      <a
                        href={r.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Sertifikayı Görüntüle
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Sertifika yüklenmedi</span>
                    )}
                    <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                      {r.driveWebViewLink ? 'Değiştir' : 'Sertifika yükle'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={pendingId === r.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCertificateUpload(r, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}

          <div className="pt-1">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">+ Yeni Kayıt Ekle</p>
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
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
                <Label>
                  Dosya No<span className="text-danger"> *</span>
                </Label>
                <Input value={newDosyaNo} onChange={(e) => setNewDosyaNo(e.target.value)} />
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteRecord, updateRecord } from '@/actions/records';
import { fmtDate, tagClassForSonuc } from '@/lib/training-status';
import type { PersonelRow } from './personel-table';
import { MykBelgesiField } from './myk-belgesi-field';
import { useConfirm } from '@/hooks/use-confirm';
import { DisciplineStatus } from '@/components/kayit/uyari-discipline-panel';

export function PersonelDetayDialog({
  personnel,
  open,
  onOpenChange,
  isAdmin,
}: {
  personnel: PersonelRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    tarih: string;
    sonuc: string;
    dosyaNo: string;
    not: string;
  }>({
    tarih: '',
    sonuc: 'Başarılı',
    dosyaNo: '',
    not: '',
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const uyariRecords = personnel.records
    .filter((r) => r.kategori === 'Uyarı')
    .slice()
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  const otherRecords = personnel.records.filter((r) => r.kategori !== 'Uyarı');

  function startEdit(r: PersonelRow['records'][number]) {
    setEditingId(r.id);
    setDraft({ tarih: r.tarih, sonuc: r.sonuc, dosyaNo: r.dosyaNo ?? '', not: r.not ?? '' });
  }

  async function saveEdit(id: string) {
    if (!draft.dosyaNo.trim()) {
      toast.error('Dosya No zorunlu.');
      return;
    }
    setPendingId(id);
    const result = await updateRecord(id, draft);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Kayıt güncellendi.');
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(r: PersonelRow['records'][number]) {
    if (
      !(await confirm({
        description: 'Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
        confirmLabel: 'Sil',
        destructive: true,
      }))
    )
      return;
    setPendingId(r.id);
    const result = await deleteRecord(r.id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Kayıt silindi.');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {personnel.ad} {personnel.soyad} — Detay
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-6 overflow-auto pr-1">
          <section className="rounded-lg border border-border bg-panel-2 p-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Uyarı Eğitimleri ({uyariRecords.length})
            </h3>
            {!uyariRecords.length ? (
              <p className="text-sm text-muted-foreground">
                Bu personel için uyarı eğitimi kaydı yok.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Eğitim</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Sonuç</TableHead>
                    <TableHead>Not</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uyariRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.egitimAdi}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {fmtDate(r.tarih)}
                      </TableCell>
                      <TableCell>
                        <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.not || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-3 border-t border-border pt-3">
              <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Uygulanan İşlem
              </h4>
              <DisciplineStatus lastAction={personnel.lastDisciplineAction} />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              MYK Belgesi
            </h3>
            <MykBelgesiField
              personnelId={personnel.id}
              webViewLink={personnel.mykBelgeDriveWebViewLink}
              gecerlilikTarihi={personnel.mykBelgeGecerlilikTarihi}
              emptyLabel="Bu personelin MYK belgesi yok — yüklemek için tıklayın"
            />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Firma / Görev Geçmişi
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Görev</TableHead>
                  <TableHead>Çalışma Şekli</TableHead>
                  <TableHead>Giriş</TableHead>
                  <TableHead>Çıkış</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">{personnel.firma || '-'}</TableCell>
                  <TableCell className="font-semibold text-muted-foreground">
                    {personnel.gorev || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {personnel.calismaSekli || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {fmtDate(personnel.iseGirisTarihi)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {personnel.durum === 'Güncel' ? (
                      <span className="tag tag-ok">Güncel</span>
                    ) : (
                      fmtDate(personnel.cikisTarihi)
                    )}
                  </TableCell>
                </TableRow>
                {personnel.history
                  .slice()
                  .sort((a, b) => (b.cikisTarihi ?? '').localeCompare(a.cikisTarihi ?? ''))
                  .map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{h.firma || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{h.gorev || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {h.calismaSekli || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {fmtDate(h.girisTarihi)}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {fmtDate(h.cikisTarihi)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Eğitim Kayıtları ({otherRecords.length})
            </h3>
            {!otherRecords.length ? (
              <p className="text-sm text-muted-foreground">Bu personel için henüz kayıt yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Eğitim</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Sonuç</TableHead>
                    <TableHead>Dosya No</TableHead>
                    <TableHead>Not</TableHead>
                    <TableHead>Sertifika</TableHead>
                    <TableHead>Girişi Yapan</TableHead>
                    {isAdmin && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherRecords.map((r) => {
                    const isEditing = editingId === r.id;
                    const isPending = pendingId === r.id;
                    if (isEditing) {
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground">{r.egitimAdi}</TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              className="w-36"
                              value={draft.tarih}
                              onChange={(e) => setDraft((d) => ({ ...d, tarih: e.target.value }))}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={draft.sonuc}
                              onValueChange={(v) =>
                                setDraft((d) => ({ ...d, sonuc: v ?? d.sonuc }))
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Başarılı">Başarılı</SelectItem>
                                <SelectItem value="Başarısız">Başarısız</SelectItem>
                                <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-32"
                              value={draft.dosyaNo}
                              onChange={(e) => setDraft((d) => ({ ...d, dosyaNo: e.target.value }))}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-40"
                              value={draft.not}
                              onChange={(e) => setDraft((d) => ({ ...d, not: e.target.value }))}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="text-muted-foreground">{r.createdByName}</TableCell>
                          <TableCell className="space-x-2 whitespace-nowrap">
                            <Button size="sm" disabled={isPending} onClick={() => saveEdit(r.id)}>
                              Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setEditingId(null)}
                            >
                              İptal
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.egitimAdi}
                          {r.kategori === 'Uyarı' && (
                            <span className="tag tag-bad ml-1.5">Uyarı</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {fmtDate(r.tarih)}
                        </TableCell>
                        <TableCell>
                          <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.dosyaNo || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{r.not || '-'}</TableCell>
                        <TableCell>
                          {r.driveWebViewLink ? (
                            <a
                              href={r.driveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Görüntüle
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.createdByName}</TableCell>
                        {isAdmin && (
                          <TableCell className="space-x-2 whitespace-nowrap">
                            <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-danger text-danger hover:bg-danger/10"
                              disabled={isPending}
                              onClick={() => handleDelete(r)}
                            >
                              Sil
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      </DialogContent>
      {ConfirmDialog}
    </Dialog>
  );
}

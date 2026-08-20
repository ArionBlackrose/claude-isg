'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FlagIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtDate, tagClassForSonuc } from '@/lib/training-status';
import { isDosyaNoRequired } from '@/lib/training-category-rules';
import { deleteRecord, updateRecord } from '@/actions/records';
import { useConfirm } from '@/hooks/use-confirm';

export type UyariRecordRow = {
  id: string;
  personelAdi: string;
  egitimAdi: string;
  /** Personelin eğitime gönderildiği tarih. */
  tarih: string;
  sonuc: 'Katılmadı' | 'Katıldı';
  /** Personel fiilen katıldığında girilen tarih — sonuç "Katıldı" değilse null. */
  katilimTarihi: string | null;
  dosyaNo: string | null;
  not: string | null;
  createdByName: string;
};

const SONUC_FILTER_LABELS: Record<string, string> = {
  all: 'Tüm durumlar',
  Katılmadı: 'Katılmadı',
  Katıldı: 'Katıldı',
};

type Draft = {
  tarih: string;
  sonuc: 'Katılmadı' | 'Katıldı';
  katilimTarihi: string;
  dosyaNo: string;
  not: string;
};

export function UyariRecordsTable({
  records,
  isAdmin,
}: {
  records: UyariRecordRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    tarih: '',
    sonuc: 'Katılmadı',
    katilimTarihi: '',
    dosyaNo: '',
    not: '',
  });
  const { confirm, ConfirmDialog } = useConfirm();

  const [search, setSearch] = useState('');
  const [sonucFilter, setSonucFilter] = useState('all');
  const [tarihStart, setTarihStart] = useState('');
  const [tarihEnd, setTarihEnd] = useState('');

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLocaleUpperCase('tr-TR');
    return records.filter((r) => {
      if (q && !`${r.personelAdi} ${r.egitimAdi}`.toLocaleUpperCase('tr-TR').includes(q)) {
        return false;
      }
      if (sonucFilter !== 'all' && r.sonuc !== sonucFilter) return false;
      if (tarihStart && r.tarih < tarihStart) return false;
      if (tarihEnd && r.tarih > tarihEnd) return false;
      return true;
    });
  }, [records, search, sonucFilter, tarihStart, tarihEnd]);

  function startEdit(r: UyariRecordRow) {
    setEditingId(r.id);
    setDraft({
      tarih: r.tarih,
      sonuc: r.sonuc,
      katilimTarihi: r.katilimTarihi ?? '',
      dosyaNo: r.dosyaNo ?? '',
      not: r.not ?? '',
    });
  }

  async function saveEdit(id: string) {
    if (isDosyaNoRequired('uyari', draft.sonuc) && !draft.dosyaNo.trim()) {
      toast.error('Dosya No zorunlu.');
      return;
    }
    if (draft.sonuc === 'Katıldı' && !draft.katilimTarihi) {
      toast.error('Katılım tarihi zorunlu.');
      return;
    }
    setPendingId(id);
    const result = await updateRecord(id, draft);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Güncellendi.');
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(r: UyariRecordRow) {
    if (
      !(await confirm({
        description: `"${r.personelAdi}" personeline ait "${r.egitimAdi}" uyarı eğitimi kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
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
    toast.success('Silindi.');
    router.refresh();
  }

  if (!records.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <FlagIcon className="size-5" />
        </div>
        <div>
          <div className="font-semibold text-foreground">Henüz uyarı eğitimi kaydı yok</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bir personelin uyarı eğitimi aldığını kaydetmek için yukarıdaki formu kullanın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Personel veya eğitim adıyla ara..."
        />
        <Select value={sonucFilter} onValueChange={(v) => setSonucFilter(v ?? 'all')}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => SONUC_FILTER_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SONUC_FILTER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={tarihStart}
          onChange={(e) => setTarihStart(e.target.value)}
          placeholder="Tarih başlangıç"
        />
        <Input
          type="date"
          value={tarihEnd}
          onChange={(e) => setTarihEnd(e.target.value)}
          placeholder="Tarih bitiş"
        />
      </div>

      {!filteredRecords.length ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Filtreye uyan kayıt bulunamadı.
        </div>
      ) : (
        <>
          {/* Mobil: kart görünümü */}
          <div className="space-y-2.5 md:hidden">
            {filteredRecords.map((r) => {
              const isEditing = editingId === r.id;
              const isPending = pendingId === r.id;
              return (
                <div key={r.id} className="rounded-lg border border-border bg-panel p-3.5">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">Gönderildiği Tarih</div>
                        <Input
                          type="date"
                          value={draft.tarih}
                          onChange={(e) => setDraft((d) => ({ ...d, tarih: e.target.value }))}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">Katılım Durumu</div>
                        <Select
                          value={draft.sonuc}
                          onValueChange={(v) =>
                            setDraft((d) => ({ ...d, sonuc: (v as Draft['sonuc']) ?? d.sonuc }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                            <SelectItem value="Katıldı">Katıldı</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {draft.sonuc === 'Katıldı' && (
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">
                            Katılım Tarihi<span className="text-danger"> *</span>
                          </div>
                          <Input
                            type="date"
                            value={draft.katilimTarihi}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, katilimTarihi: e.target.value }))
                            }
                          />
                        </div>
                      )}
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          Dosya No
                          {isDosyaNoRequired('uyari', draft.sonuc) && (
                            <span className="text-danger"> *</span>
                          )}
                        </div>
                        <Input
                          value={draft.dosyaNo}
                          onChange={(e) => setDraft((d) => ({ ...d, dosyaNo: e.target.value }))}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">Not</div>
                        <Input
                          value={draft.not}
                          onChange={(e) => setDraft((d) => ({ ...d, not: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={isPending} onClick={() => saveEdit(r.id)}>
                          Kaydet
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          İptal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{r.personelAdi}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{r.egitimAdi}</div>
                        </div>
                        <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">
                            Gönderildiği Tarih
                          </div>
                          <div className="font-mono">{fmtDate(r.tarih)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">
                            Katılım Tarihi
                          </div>
                          <div className="font-mono">
                            {r.sonuc === 'Katıldı' ? fmtDate(r.katilimTarihi) : '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase">Dosya No</div>
                          <div>{r.dosyaNo || '-'}</div>
                        </div>
                        {r.not && (
                          <div className="col-span-2">
                            <div className="text-xs text-muted-foreground uppercase">Not</div>
                            <div>{r.not}</div>
                          </div>
                        )}
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground uppercase">
                            Girişi Yapan
                          </div>
                          <div>{r.createdByName}</div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="mt-3 flex gap-2">
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
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Masaüstü: tam tablo */}
          <Table containerClassName="hidden max-h-[480px] overflow-auto rounded-lg border border-border md:block">
            <TableHeader>
              <TableRow>
                <TableHead>Gönderildiği Tarih</TableHead>
                <TableHead>Personel</TableHead>
                <TableHead>Uyarı Eğitimi</TableHead>
                <TableHead>Katılım Durumu</TableHead>
                <TableHead>Katılım Tarihi</TableHead>
                <TableHead>Dosya No</TableHead>
                <TableHead>Not</TableHead>
                <TableHead>Girişi Yapan</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((r) => {
                const isEditing = editingId === r.id;
                const isPending = pendingId === r.id;
                if (isEditing) {
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Input
                          type="date"
                          className="w-36"
                          value={draft.tarih}
                          onChange={(e) => setDraft((d) => ({ ...d, tarih: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.personelAdi}</TableCell>
                      <TableCell className="text-muted-foreground">{r.egitimAdi}</TableCell>
                      <TableCell>
                        <Select
                          value={draft.sonuc}
                          onValueChange={(v) =>
                            setDraft((d) => ({ ...d, sonuc: (v as Draft['sonuc']) ?? d.sonuc }))
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                            <SelectItem value="Katıldı">Katıldı</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {draft.sonuc === 'Katıldı' && (
                          <Input
                            type="date"
                            className="w-36"
                            value={draft.katilimTarihi}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, katilimTarihi: e.target.value }))
                            }
                          />
                        )}
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
                      <TableCell className="text-muted-foreground">{r.createdByName}</TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        <Button size="sm" disabled={isPending} onClick={() => saveEdit(r.id)}>
                          Kaydet
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                          İptal
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{fmtDate(r.tarih)}</TableCell>
                    <TableCell>{r.personelAdi}</TableCell>
                    <TableCell>{r.egitimAdi}</TableCell>
                    <TableCell>
                      <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {r.sonuc === 'Katıldı' ? fmtDate(r.katilimTarihi) : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.dosyaNo || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{r.not || '-'}</TableCell>
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
        </>
      )}
      {ConfirmDialog}
    </>
  );
}

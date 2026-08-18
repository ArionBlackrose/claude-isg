'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { deleteTraining, updateTraining } from '@/actions/training';
import { TRAINING_CATEGORIES, type TrainingInput } from '@/schemas/training';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export type KatalogRow = {
  id: string;
  ad: string;
  kategori: string;
  gecerlilikAy: number;
  egitimSuresi: number;
  recordCount: number;
  expiredCount: number;
  soonCount: number;
};

export function KatalogTable({
  rows,
  isAdmin,
  canDelete,
}: {
  rows: KatalogRow[];
  isAdmin: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    ad: string;
    kategori: TrainingInput['kategori'];
    gecerlilikAy: string;
    egitimSuresi: string;
  }>({
    ad: '',
    kategori: 'Genel',
    gecerlilikAy: '0',
    egitimSuresi: '0',
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.ad.toLocaleLowerCase('tr-TR').includes(q) ||
        row.kategori.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [rows, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  function startEdit(row: KatalogRow) {
    setEditingId(row.id);
    setDraft({
      ad: row.ad,
      kategori: (TRAINING_CATEGORIES as readonly string[]).includes(row.kategori)
        ? (row.kategori as TrainingInput['kategori'])
        : 'Genel',
      gecerlilikAy: String(row.gecerlilikAy),
      egitimSuresi: String(row.egitimSuresi),
    });
  }

  async function saveEdit(id: string) {
    setPendingId(id);
    const result = await updateTraining(id, {
      ad: draft.ad,
      kategori: draft.kategori,
      gecerlilikAy: Number(draft.gecerlilikAy) || 0,
      egitimSuresi: Number(draft.egitimSuresi) || 0,
    });
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(row: KatalogRow) {
    const warning = row.recordCount
      ? `"${row.ad}" eğitimini silmek istediğinize emin misiniz?\n\nBu eğitime ait ${row.recordCount} kayıt da birlikte silinecektir.`
      : `"${row.ad}" eğitimini silmek istediğinize emin misiniz?`;
    if (!window.confirm(warning)) return;
    setPendingId(row.id);
    const result = await deleteTraining(row.id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (!rows.length) {
    return (
      <div className="p-10 text-center text-muted-foreground">Henüz eğitim türü eklenmedi.</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Eğitim adı veya kategoriyle arayın..."
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">{filteredRows.length} eğitim</span>
      </div>
      {filteredRows.length === 0 ? (
        <div className="rounded-lg border border-border p-10 text-center text-muted-foreground">
          Sonuç bulunamadı.
        </div>
      ) : (
        <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
          <TableHeader>
            <TableRow>
              <TableHead>Eğitim Adı</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Geçerlilik (Ay)</TableHead>
              <TableHead>Süre (Saat)</TableHead>
              <TableHead>Kayıt Sayısı</TableHead>
              <TableHead>Durum</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((row) => {
              const isEditing = editingId === row.id;
              const isPending = pendingId === row.id;
              if (isEditing) {
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={draft.ad}
                        onChange={(e) => setDraft((d) => ({ ...d, ad: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={draft.kategori}
                        onValueChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            kategori: (v as TrainingInput['kategori']) ?? d.kategori,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAINING_CATEGORIES.map((kategori) => (
                            <SelectItem key={kategori} value={kategori}>
                              {kategori}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={draft.gecerlilikAy}
                        onChange={(e) => setDraft((d) => ({ ...d, gecerlilikAy: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={draft.egitimSuresi}
                        onChange={(e) => setDraft((d) => ({ ...d, egitimSuresi: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {row.recordCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Button size="sm" disabled={isPending} onClick={() => saveEdit(row.id)}>
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
                <TableRow key={row.id}>
                  <TableCell>{row.ad}</TableCell>
                  <TableCell className="text-muted-foreground">{row.kategori || '-'}</TableCell>
                  <TableCell>{row.gecerlilikAy ? `${row.gecerlilikAy} ay` : 'Süresiz'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.egitimSuresi ? `${row.egitimSuresi} saat` : '-'}
                  </TableCell>
                  <TableCell className="font-mono">{row.recordCount}</TableCell>
                  <TableCell className="space-x-2.5 text-xs whitespace-nowrap">
                    {row.expiredCount > 0 && (
                      <Link
                        href={`/rapor?egitim=${row.id}&durum=expired`}
                        className="text-danger hover:underline"
                      >
                        {row.expiredCount} süresi doldu
                      </Link>
                    )}
                    {row.soonCount > 0 && (
                      <Link
                        href={`/rapor?egitim=${row.id}&durum=soon`}
                        className="text-primary hover:underline"
                      >
                        {row.soonCount} yaklaşıyor
                      </Link>
                    )}
                    {!row.expiredCount && !row.soonCount && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                        Düzenle
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-danger text-danger hover:bg-danger/10"
                          disabled={isPending}
                          onClick={() => handleDelete(row)}
                        >
                          Sil
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {filteredRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Sayfa başına:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => handlePageSizeChange(Number(v) || PAGE_SIZE_OPTIONS[0])}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Önceki
            </Button>
            <span className="text-xs text-muted-foreground">
              Sayfa {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

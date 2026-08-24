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
import { toUpperTR } from '@/lib/utils';
import { TRAINING_CATEGORIES, type TrainingInput } from '@/schemas/training';
import { useConfirm } from '@/hooks/use-confirm';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/ui/pagination-bar';

export type KatalogRow = {
  id: string;
  ad: string;
  kategori: string;
  gecerlilikAy: number;
  egitimSuresi: number;
  digerSecenegiVar: boolean;
  recordCount: number;
  expiredCount: number;
  soonCount: number;
};

type KatalogDraft = {
  ad: string;
  kategori: TrainingInput['kategori'];
  gecerlilikAy: string;
  egitimSuresi: string;
  digerSecenegiVar: boolean;
};

/** Katalog satırı düzenleme alanlarının tek kaynağı — hem mobil kart hem
 * masaüstü tablo satırı bu kontrolleri kullanır, sadece etraflarındaki
 * yerleşim (label/grid vs. TableCell) farklıdır. */
function buildKatalogDraftFields(
  draft: KatalogDraft,
  setDraft: React.Dispatch<React.SetStateAction<KatalogDraft>>,
  numberInputClassName?: string,
) {
  return {
    adField: (
      <Input
        value={draft.ad}
        onChange={(e) => setDraft((d) => ({ ...d, ad: e.target.value }))}
        placeholder="Eğitim adı"
      />
    ),
    kategoriField: (
      <Select
        value={draft.kategori}
        onValueChange={(v) =>
          setDraft((d) => ({ ...d, kategori: (v as TrainingInput['kategori']) ?? d.kategori }))
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
    ),
    gecerlilikField: (
      <Input
        type="number"
        min={0}
        className={numberInputClassName}
        value={draft.gecerlilikAy}
        onChange={(e) => setDraft((d) => ({ ...d, gecerlilikAy: e.target.value }))}
      />
    ),
    suresiField: (
      <Input
        type="number"
        min={0}
        step={0.25}
        className={numberInputClassName}
        value={draft.egitimSuresi}
        onChange={(e) => setDraft((d) => ({ ...d, egitimSuresi: e.target.value }))}
      />
    ),
    digerField:
      draft.kategori === 'Saha Eğitimi' ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            className="accent-primary"
            checked={draft.digerSecenegiVar}
            onChange={(e) => setDraft((d) => ({ ...d, digerSecenegiVar: e.target.checked }))}
          />
          &quot;Diğer&quot; seçeneği
        </label>
      ) : null,
  };
}

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
  const [draft, setDraft] = useState<KatalogDraft>({
    ad: '',
    kategori: 'Genel',
    gecerlilikAy: '0',
    egitimSuresi: '0',
    digerSecenegiVar: false,
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { confirm, ConfirmDialog } = useConfirm();

  const filteredRows = useMemo(() => {
    const q = toUpperTR(search);
    if (!q) return rows;
    return rows.filter(
      (row) => toUpperTR(row.ad).includes(q) || toUpperTR(row.kategori).includes(q),
    );
  }, [rows, search]);

  const { page, setPage, pageSize, totalPages, changePageSize, withPageReset } = usePagination(
    filteredRows.length,
  );
  const handleSearchChange = withPageReset(setSearch);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const mobileDraftFields = buildKatalogDraftFields(draft, setDraft);
  const desktopDraftFields = buildKatalogDraftFields(draft, setDraft, 'w-24');

  function startEdit(row: KatalogRow) {
    setEditingId(row.id);
    setDraft({
      ad: row.ad,
      kategori: (TRAINING_CATEGORIES as readonly string[]).includes(row.kategori)
        ? (row.kategori as TrainingInput['kategori'])
        : 'Genel',
      gecerlilikAy: String(row.gecerlilikAy),
      egitimSuresi: String(row.egitimSuresi),
      digerSecenegiVar: row.digerSecenegiVar,
    });
  }

  async function saveEdit(id: string) {
    setPendingId(id);
    const result = await updateTraining(id, {
      ad: draft.ad,
      kategori: draft.kategori,
      gecerlilikAy: Number(draft.gecerlilikAy) || 0,
      egitimSuresi: Number(draft.egitimSuresi) || 0,
      digerSecenegiVar: draft.kategori === 'Saha Eğitimi' ? draft.digerSecenegiVar : false,
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
    if (!(await confirm({ description: warning, confirmLabel: 'Sil', destructive: true }))) return;
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
        <>
          {/* Mobil: kart görünümü — geniş tablo yerine her satır tek bir kart */}
          <div className="space-y-2.5 md:hidden">
            {pagedRows.map((row) => {
              const isEditing = editingId === row.id;
              const isPending = pendingId === row.id;
              if (isEditing) {
                return (
                  <div
                    key={row.id}
                    className="space-y-2.5 rounded-lg border border-primary bg-panel p-3.5"
                  >
                    {mobileDraftFields.adField}
                    {mobileDraftFields.kategoriField}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">Geçerlilik (ay)</div>
                        {mobileDraftFields.gecerlilikField}
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">Süre (saat)</div>
                        {mobileDraftFields.suresiField}
                      </div>
                    </div>
                    {mobileDraftFields.digerField}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={isPending} onClick={() => saveEdit(row.id)}>
                        Kaydet
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        İptal
                      </Button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={row.id} className="rounded-lg border border-border bg-panel p-3.5">
                  <div className="font-semibold">{row.ad}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Kategori</div>
                      <div>{row.kategori || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Geçerlilik</div>
                      <div>{row.gecerlilikAy ? `${row.gecerlilikAy} ay` : 'Süresiz'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Süre</div>
                      <div>{row.egitimSuresi ? `${row.egitimSuresi} saat` : '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Kayıt</div>
                      <div className="font-mono">{row.recordCount}</div>
                    </div>
                  </div>
                  {(row.expiredCount > 0 || row.soonCount > 0) && (
                    <div className="mt-2 space-x-3 text-xs">
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
                    </div>
                  )}
                  {isAdmin && (
                    <div className="mt-3 flex gap-2">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Masaüstü: tam tablo */}
          <Table containerClassName="hidden max-h-[520px] overflow-auto rounded-lg border border-border md:block">
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
                      <TableCell>{desktopDraftFields.adField}</TableCell>
                      <TableCell>{desktopDraftFields.kategoriField}</TableCell>
                      <TableCell>{desktopDraftFields.gecerlilikField}</TableCell>
                      <TableCell>{desktopDraftFields.suresiField}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {row.recordCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="space-x-2 whitespace-nowrap">
                        {desktopDraftFields.digerField}
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
        </>
      )}
      {filteredRows.length > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { statusFor, type TrainingStatusCode } from '@/lib/training-status';
import { downloadWorkbook, todayFileStamp } from '@/lib/excel';
import { KayitEditDialog } from './kayit-edit-dialog';

export type LogPersonel = {
  id: string;
  tcNo: string | null;
  ad: string;
  soyad: string;
  gorev: string | null;
  firma: string | null;
  calismaSekli: string | null;
  durum: 'Güncel' | 'Çıkış';
};
export type LogTraining = { id: string; ad: string; gecerlilikAy: number };
export type LogRecord = {
  id: string;
  personnelId: string;
  trainingId: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
  dosyaNo: string | null;
  not: string | null;
  driveWebViewLink: string | null;
};

const DURUM_FILTER_LABELS: Record<string, string> = {
  all: 'Tüm durumlar',
  Güncel: 'Güncel',
  Çıkış: 'Çıkış',
};

const EGITIM_DURUM_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tüm eğitim durumları' },
  { value: 'expired', label: 'Süresi Doldu' },
  { value: 'soon', label: 'Yaklaşıyor (30g)' },
  { value: 'valid', label: 'Geçerli' },
  { value: 'none', label: 'Almadı' },
];
const EGITIM_DURUM_LABELS = Object.fromEntries(EGITIM_DURUM_OPTIONS.map((o) => [o.value, o.label]));

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}

function tagClassFor(code: TrainingStatusCode) {
  if (code === 'expired') return 'tag-bad';
  if (code === 'soon') return 'tag-warn';
  if (code === 'valid') return 'tag-ok';
  return 'tag-none';
}

export function LogTable({
  personnel,
  trainings,
  records,
  isAdmin,
}: {
  personnel: LogPersonel[];
  trainings: LogTraining[];
  records: LogRecord[];
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState('');
  const [durumFilter, setDurumFilter] = useState('all');
  const [firmaFilter, setFirmaFilter] = useState('all');
  const [calismaSekliFilter, setCalismaSekliFilter] = useState('all');
  const [egitimFilter, setEgitimFilter] = useState('all');
  const [egitimDurumFilter, setEgitimDurumFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [editing, setEditing] = useState<{ personnelId: string; trainingId: string } | null>(null);

  const firmaOptions = useMemo(() => {
    const set = new Set(personnel.map((p) => p.firma).filter((v): v is string => !!v));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))];
  }, [personnel]);
  const calismaSekliOptions = useMemo(() => {
    const set = new Set(personnel.map((p) => p.calismaSekli).filter((v): v is string => !!v));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))];
  }, [personnel]);
  const egitimOptions = useMemo(
    () => [{ id: 'all', ad: 'Tüm eğitimler' }, ...trainings],
    [trainings],
  );
  const egitimLabels = useMemo(
    () => Object.fromEntries(egitimOptions.map((t) => [t.id, t.ad])),
    [egitimOptions],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return personnel.filter((p) => {
      if (durumFilter !== 'all' && p.durum !== durumFilter) return false;
      if (firmaFilter !== 'all' && p.firma !== firmaFilter) return false;
      if (calismaSekliFilter !== 'all' && p.calismaSekli !== calismaSekliFilter) return false;
      if (q && !`${p.ad} ${p.soyad} ${p.tcNo ?? ''}`.toLocaleLowerCase('tr-TR').includes(q))
        return false;
      if (egitimDurumFilter !== 'all') {
        const egitimler =
          egitimFilter === 'all' ? trainings : trainings.filter((t) => t.id === egitimFilter);
        const matches = egitimler.some(
          (t) => statusFor(p.id, t.id, records, t).code === egitimDurumFilter,
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [
    personnel,
    search,
    durumFilter,
    firmaFilter,
    calismaSekliFilter,
    egitimFilter,
    egitimDurumFilter,
    trainings,
    records,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function updateFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }
  const handleSearchChange = updateFilter(setSearch);
  const handleDurumFilterChange = updateFilter(setDurumFilter);
  const handleFirmaFilterChange = updateFilter(setFirmaFilter);
  const handleCalismaSekliFilterChange = updateFilter(setCalismaSekliFilter);
  const handleEgitimFilterChange = updateFilter(setEgitimFilter);
  const handleEgitimDurumFilterChange = updateFilter(setEgitimDurumFilter);
  const handlePageSizeChange = updateFilter(setPageSize);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const editingPersonel = editing ? personnel.find((p) => p.id === editing.personnelId) : null;
  const editingTraining = editing ? trainings.find((t) => t.id === editing.trainingId) : null;

  function handleExport() {
    const header = [
      'No',
      'TC Kimlik No',
      'Adı Soyadı',
      'Görevi',
      'Firması',
      'Çalışma Şekli',
      'Çalışma Durumu',
      ...trainings.map((t) => t.ad),
    ];
    const aoa: (string | number)[][] = [header];
    filtered.forEach((p, i) => {
      const base = [
        i + 1,
        p.tcNo || '',
        `${p.ad} ${p.soyad}`,
        p.gorev || '',
        p.firma || '',
        p.calismaSekli || '',
        p.durum,
      ];
      const cols = trainings.map((t) => {
        const s = statusFor(p.id, t.id, records, t);
        return s.tarih && s.code === 'valid' ? fmtDate(s.label) : s.label;
      });
      aoa.push([...base, ...cols]);
    });
    downloadWorkbook(aoa, 'Kayıtlar', `egitim-kayitlari-${todayFileStamp()}.xlsx`);
  }

  if (!trainings.length) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Henüz eğitim türü tanımlanmadı — önce Eğitim Kataloğu&apos;na eğitim ekleyin.
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap gap-2.5">
        <Input
          placeholder="TC, ad veya soyad ara..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-64"
        />
        <Select value={durumFilter} onValueChange={(v) => handleDurumFilterChange(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => DURUM_FILTER_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="Güncel">Güncel</SelectItem>
            <SelectItem value="Çıkış">Çıkış</SelectItem>
          </SelectContent>
        </Select>
        <Select value={firmaFilter} onValueChange={(v) => handleFirmaFilterChange(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v === 'all' ? 'Tüm firmalar' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {firmaOptions.map((f) => (
              <SelectItem key={f} value={f}>
                {f === 'all' ? 'Tüm firmalar' : f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={calismaSekliFilter}
          onValueChange={(v) => handleCalismaSekliFilterChange(v ?? 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue>{(v: string) => (v === 'all' ? 'Tüm çalışma şekilleri' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {calismaSekliOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c === 'all' ? 'Tüm çalışma şekilleri' : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={egitimFilter} onValueChange={(v) => handleEgitimFilterChange(v ?? 'all')}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => egitimLabels[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {egitimOptions.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.ad}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={egitimDurumFilter}
          onValueChange={(v) => handleEgitimDurumFilterChange(v ?? 'all')}
        >
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => EGITIM_DURUM_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {EGITIM_DURUM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          Excel İndir (Yedek)
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} personel</span>
      </div>
      {!filtered.length ? (
        <div className="p-10 text-center text-muted-foreground">Kayıt bulunamadı.</div>
      ) : (
        <>
          <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>TC Kimlik No</TableHead>
                  <TableHead>Adı Soyadı</TableHead>
                  <TableHead>Görevi</TableHead>
                  <TableHead>Firması</TableHead>
                  <TableHead>Çalışma Şekli</TableHead>
                  <TableHead>Çalışma Durumu</TableHead>
                  {trainings.map((t) => (
                    <TableHead key={t.id}>{t.ad}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {(page - 1) * pageSize + i + 1}
                    </TableCell>
                    <TableCell className="font-mono">{p.tcNo || '-'}</TableCell>
                    <TableCell>
                      {p.ad} {p.soyad}
                    </TableCell>
                    <TableCell>{p.gorev || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.calismaSekli || '-'}</TableCell>
                    <TableCell>
                      <span className={`tag ${p.durum === 'Çıkış' ? 'tag-bad' : 'tag-ok'}`}>
                        {p.durum}
                      </span>
                    </TableCell>
                    {trainings.map((t) => {
                      const s = statusFor(p.id, t.id, records, t);
                      return (
                        <TableCell key={t.id}>
                          <button
                            type="button"
                            className={`tag ${tagClassFor(s.code)} cursor-pointer`}
                            title={
                              s.tarih
                                ? `${fmtDate(s.tarih)} — düzenlemek için tıklayın`
                                : 'düzenlemek için tıklayın'
                            }
                            onClick={() => setEditing({ personnelId: p.id, trainingId: t.id })}
                          >
                            {s.code === 'valid' ? fmtDate(s.label) : s.label}
                          </button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        </>
      )}

      {editing && editingPersonel && editingTraining && (
        <KayitEditDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          personnelId={editing.personnelId}
          trainingId={editing.trainingId}
          personName={`${editingPersonel.ad} ${editingPersonel.soyad}`}
          trainingName={editingTraining.ad}
          records={records.filter(
            (r) => r.personnelId === editing.personnelId && r.trainingId === editing.trainingId,
          )}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

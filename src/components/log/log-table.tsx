'use client';

import { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxIcon,
  ComboboxContent,
  ComboboxItem,
} from '@/components/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { addMonths, daysBetween, todayStr, fmtDate, tagClassFor } from '@/lib/training-status';
import { downloadWorkbook, todayFileStamp } from '@/lib/excel';
import { TRAINING_CATEGORIES } from '@/schemas/training';
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
export type LogTraining = { id: string; ad: string; kategori: string; gecerlilikAy: number };
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
  const [kategoriFilter, setKategoriFilter] = useState('all');
  const [egitimFilter, setEgitimFilter] = useState('all');
  const [egitimDurumFilter, setEgitimDurumFilter] = useState('all');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');
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
  // Eğitim seçenekleri, seçili kategoriye göre daraltılır — bir kategori
  // seçildiğinde "Eğitim" listesinde sadece o kategoriye ait eğitimler görünür.
  const egitimOptions = useMemo(() => {
    const scoped =
      kategoriFilter === 'all' ? trainings : trainings.filter((t) => t.kategori === kategoriFilter);
    return [{ id: 'all', ad: 'Tüm eğitimler' }, ...scoped];
  }, [trainings, kategoriFilter]);

  const usedTrainingIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) set.add(r.trainingId);
    return set;
  }, [records]);

  /** Kategori ve/veya belirli bir eğitim seçimine göre dışa aktarılacak
   * eğitim sütunları (Excel İndir). Filtre uygulanmadığında kataloğun
   * tamamı dahil edilir. */
  const exportTrainings = useMemo(() => {
    let list = trainings;
    if (kategoriFilter !== 'all') list = list.filter((t) => t.kategori === kategoriFilter);
    if (egitimFilter !== 'all') list = list.filter((t) => t.id === egitimFilter);
    return list;
  }, [trainings, kategoriFilter, egitimFilter]);

  /** Ekranda tabloda gösterilecek eğitim sütunları. Hiçbir kategori/eğitim
   * seçilmemişse — yani varsayılan görünümde — kataloğun tamamı yerine
   * sadece en az bir kaydı olan eğitimler gösterilir; katalogda yüzlerce
   * hiç kullanılmamış eğitim türü olabildiğinden (ör. toplu içe aktarılan
   * "Özel" eğitimler), hepsini sütun olarak basmak tabloyu binlerce hücreye
   * şişirip her Kayıtlar ziyaretini yavaşlatıyordu. Belirli bir kategori
   * veya eğitim seçildiğinde bu daraltma uygulanmaz — o zaman kaydı olmasa
   * bile seçilen eğitim(ler) gösterilir. */
  const visibleTrainings = useMemo(() => {
    if (kategoriFilter === 'all' && egitimFilter === 'all') {
      return exportTrainings.filter((t) => usedTrainingIds.has(t.id));
    }
    return exportTrainings;
  }, [exportTrainings, kategoriFilter, egitimFilter, usedTrainingIds]);

  // records'ı personel×eğitim anahtarına göre bir kez gruplayıp önbellekler;
  // statusFor'un her çağrıda tüm records dizisini taraması yerine render,
  // filtre ve export arasında paylaşılan tek bir O(records) geçiş yapılır.
  const successRecordsByKey = useMemo(() => {
    const map = new Map<string, LogRecord[]>();
    for (const r of records) {
      if (r.sonuc !== 'Başarılı') continue;
      const key = `${r.personnelId}|${r.trainingId}`;
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    for (const list of map.values()) list.sort((a, b) => b.tarih.localeCompare(a.tarih));
    return map;
  }, [records]);
  const getStatus = useCallback(
    (personnelId: string, trainingId: string, training: LogTraining | undefined) => {
      const successRecords = successRecordsByKey.get(`${personnelId}|${trainingId}`);
      if (!successRecords?.length) {
        return { code: 'none' as const, label: 'Almadı', tarih: null };
      }
      const last = successRecords[0];
      if (!training || !training.gecerlilikAy) {
        return { code: 'valid' as const, label: last.tarih, tarih: last.tarih };
      }
      const expiry = addMonths(last.tarih, training.gecerlilikAy);
      const diff = daysBetween(todayStr(), expiry);
      if (diff < 0) return { code: 'expired' as const, label: 'Süresi Doldu', tarih: last.tarih };
      if (diff <= 30)
        return { code: 'soon' as const, label: `Yaklaşıyor (${diff}g)`, tarih: last.tarih };
      return { code: 'valid' as const, label: last.tarih, tarih: last.tarih };
    },
    [successRecordsByKey],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return personnel.filter((p) => {
      if (durumFilter !== 'all' && p.durum !== durumFilter) return false;
      if (firmaFilter !== 'all' && p.firma !== firmaFilter) return false;
      if (calismaSekliFilter !== 'all' && p.calismaSekli !== calismaSekliFilter) return false;
      if (q && !`${p.ad} ${p.soyad} ${p.tcNo ?? ''}`.toLocaleLowerCase('tr-TR').includes(q))
        return false;
      // Eğitim durumu açıkça seçilmişse o duruma tam eşleşme aranır (ör.
      // "Almadı" seçilirse eğitimi almayanlar listelenir). Durum seçilmemiş
      // ama bir kategori/eğitim seçilmişse, varsayılan olarak sadece o
      // eğitimi/kategoriyi ALMIŞ kişiler listelenir — aksi halde herkes
      // (alan/almayan) görünüyordu.
      if (kategoriFilter !== 'all' || egitimFilter !== 'all' || egitimDurumFilter !== 'all') {
        const matches = visibleTrainings.some((t) => {
          const code = getStatus(p.id, t.id, t).code;
          return egitimDurumFilter !== 'all' ? code === egitimDurumFilter : code !== 'none';
        });
        if (!matches) return false;
      }
      if (tarihBaslangic || tarihBitis) {
        const visibleIds = new Set(visibleTrainings.map((t) => t.id));
        const hasRecordInRange = records.some(
          (r) =>
            r.personnelId === p.id &&
            visibleIds.has(r.trainingId) &&
            (!tarihBaslangic || r.tarih >= tarihBaslangic) &&
            (!tarihBitis || r.tarih <= tarihBitis),
        );
        if (!hasRecordInRange) return false;
      }
      return true;
    });
  }, [
    personnel,
    search,
    durumFilter,
    firmaFilter,
    calismaSekliFilter,
    kategoriFilter,
    egitimFilter,
    egitimDurumFilter,
    tarihBaslangic,
    tarihBitis,
    visibleTrainings,
    records,
    getStatus,
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
  const handleKategoriFilterChange = updateFilter(setKategoriFilter);
  const handleEgitimFilterChange = updateFilter(setEgitimFilter);
  const handleEgitimDurumFilterChange = updateFilter(setEgitimDurumFilter);
  const handleTarihBaslangicChange = updateFilter(setTarihBaslangic);
  const handleTarihBitisChange = updateFilter(setTarihBitis);
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
      ...exportTrainings.map((t) => t.ad),
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
      const cols = exportTrainings.map((t) => {
        const s = getStatus(p.id, t.id, t);
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
        <Select
          value={kategoriFilter}
          onValueChange={(v) => {
            handleKategoriFilterChange(v ?? 'all');
            handleEgitimFilterChange('all');
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue>{(v: string) => (v === 'all' ? 'Tüm kategoriler' : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kategoriler</SelectItem>
            {TRAINING_CATEGORIES.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Combobox
          items={egitimOptions}
          value={egitimOptions.find((t) => t.id === egitimFilter) ?? egitimOptions[0]}
          onValueChange={(v) => handleEgitimFilterChange(v?.id ?? 'all')}
          itemToStringLabel={(t) => t.ad}
          isItemEqualToValue={(a, b) => a.id === b.id}
        >
          <ComboboxInputGroup className="w-64">
            <ComboboxInput placeholder="Eğitim adıyla ara..." />
            <ComboboxIcon />
          </ComboboxInputGroup>
          <ComboboxContent>
            {(t: { id: string; ad: string }) => (
              <ComboboxItem key={t.id} value={t}>
                {t.ad}
              </ComboboxItem>
            )}
          </ComboboxContent>
        </Combobox>
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
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={tarihBaslangic}
            onChange={(e) => handleTarihBaslangicChange(e.target.value)}
            className="w-40"
            aria-label="Tarih başlangıç"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={tarihBitis}
            onChange={(e) => handleTarihBitisChange(e.target.value)}
            className="w-40"
            aria-label="Tarih bitiş"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          Excel İndir (Yedek)
        </Button>
        <span className="text-xs text-muted-foreground">{filtered.length} personel</span>
      </div>
      {!filtered.length ? (
        <div className="p-10 text-center text-muted-foreground">Kayıt bulunamadı.</div>
      ) : (
        <>
          <Table
            className="table-fixed"
            containerClassName="max-h-[560px] overflow-auto rounded-lg border border-border"
          >
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">No</TableHead>
                <TableHead className="w-28">TC Kimlik No</TableHead>
                <TableHead className="w-40">Adı Soyadı</TableHead>
                <TableHead className="w-32">Görevi</TableHead>
                <TableHead className="w-32">Firması</TableHead>
                <TableHead className="w-28">Çalışma Şekli</TableHead>
                <TableHead className="w-28">Çalışma Durumu</TableHead>
                {visibleTrainings.map((t) => (
                  <TableHead key={t.id} className="w-40 text-center">
                    {t.ad}
                  </TableHead>
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
                  <TableCell className="whitespace-normal">
                    {p.ad} {p.soyad}
                  </TableCell>
                  <TableCell className="whitespace-normal">{p.gorev || '-'}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {p.firma || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.calismaSekli || '-'}</TableCell>
                  <TableCell>
                    <span className={`tag ${p.durum === 'Çıkış' ? 'tag-bad' : 'tag-ok'}`}>
                      {p.durum}
                    </span>
                  </TableCell>
                  {visibleTrainings.map((t) => {
                    const s = getStatus(p.id, t.id, t);
                    return (
                      <TableCell key={t.id} className="w-40 text-center">
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

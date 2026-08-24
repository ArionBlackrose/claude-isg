'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  UsersIcon,
  UserMinusIcon,
  BookOpenIcon,
  ClipboardListIcon,
  TriangleAlertIcon,
  ClockIcon,
  TimerIcon,
  CalendarRangeIcon,
  CalendarDaysIcon,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, toUpperTR } from '@/lib/utils';
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
import {
  statusFor,
  fmtDate,
  todayStr,
  daysInMonth,
  tagClassForSonuc,
  TONE_CLASSES,
  type TrainingStatusCode,
} from '@/lib/training-status';
import { downloadWorkbook, todayFileStamp } from '@/lib/excel';
import { TRAINING_CATEGORIES } from '@/schemas/training';
import {
  computeOturumlar,
  totalAdamSaat,
  aggregateByMonth,
  aggregateByCategory,
  aggregateByTraining,
  monthKeyOf,
} from '@/lib/adam-saat';

type Personel = {
  id: string;
  tcNo: string | null;
  ad: string;
  soyad: string;
  gorev: string | null;
  firma: string | null;
  calismaSekli: string | null;
  durum: 'Güncel' | 'Çıkış';
};
type Training = {
  id: string;
  ad: string;
  kategori: string;
  gecerlilikAy: number;
  egitimSuresi: number;
};
type Rec = {
  personnelId: string;
  trainingId: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı' | 'Katıldı';
};

const DURUM_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tüm durumlar' },
  { value: 'expired', label: 'Süresi Doldu' },
  { value: 'soon', label: 'Yaklaşıyor (30g)' },
  { value: 'valid', label: 'Geçerli' },
  { value: 'none', label: 'Almadı' },
];
const DURUM_LABELS = Object.fromEntries(DURUM_OPTIONS.map((o) => [o.value, o.label]));

function firstDayOfMonth(monthKey: string): string {
  return `${monthKey}-01`;
}
function lastDayOfMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${monthKey}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
}

type DetailView =
  'none' | 'guncelPersonel' | 'cikisPersonel' | 'egitimTuru' | 'kayitlar' | 'durum' | 'adamSaat';

export function RaporView({
  personnel,
  allPersonnelCount,
  cikisCount,
  trainings,
  records,
  initialEgitim,
  initialDurum,
  projeBaslangicTarihi,
}: {
  personnel: Personel[];
  allPersonnelCount: number;
  cikisCount: number;
  trainings: Training[];
  records: Rec[];
  initialEgitim: string;
  initialDurum: string;
  projeBaslangicTarihi: string | null;
}) {
  const [search, setSearch] = useState('');
  const [egitimFilter, setEgitimFilter] = useState(initialEgitim);
  const [durumFilter, setDurumFilter] = useState(initialDurum);
  const [detailView, setDetailView] = useState<DetailView>(
    initialEgitim !== 'all' || initialDurum !== 'all' ? 'durum' : 'none',
  );
  const [adamSaatKategoriFilter, setAdamSaatKategoriFilter] = useState('all');
  const currentMonthKey = monthKeyOf(todayStr());
  const [rangeStart, setRangeStart] = useState(firstDayOfMonth(currentMonthKey));
  const [rangeEnd, setRangeEnd] = useState(lastDayOfMonth(currentMonthKey));

  const { expiredCount, soonCount } = useMemo(() => {
    let expired = 0;
    let soon = 0;
    personnel.forEach((p) =>
      trainings.forEach((t) => {
        const s = statusFor(p.id, t.id, records, t);
        if (s.code === 'expired') expired++;
        if (s.code === 'soon') soon++;
      }),
    );
    return { expiredCount: expired, soonCount: soon };
  }, [personnel, trainings, records]);

  const egitimOptions = useMemo(
    () => [{ id: 'all', ad: 'Tüm eğitimler' }, ...trainings],
    [trainings],
  );
  const egitimLabels = useMemo(
    () => Object.fromEntries(egitimOptions.map((t) => [t.id, t.ad])),
    [egitimOptions],
  );

  const q = toUpperTR(search);

  const filteredPeople = useMemo(() => {
    if (!q) return personnel;
    return personnel.filter((p) => toUpperTR(`${p.ad} ${p.soyad}`).includes(q));
  }, [personnel, q]);

  const guncelPersonelList = useMemo(
    () => filteredPeople.filter((p) => p.durum === 'Güncel'),
    [filteredPeople],
  );
  const cikisPersonelList = useMemo(
    () => filteredPeople.filter((p) => p.durum === 'Çıkış'),
    [filteredPeople],
  );

  const trainingCountMap = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => map.set(r.trainingId, (map.get(r.trainingId) ?? 0) + 1));
    return map;
  }, [records]);
  const egitimTuruList = useMemo(() => {
    if (!q) return trainings;
    return trainings.filter((t) => toUpperTR(t.ad).includes(q));
  }, [trainings, q]);

  const personelMap = useMemo(() => new Map(personnel.map((p) => [p.id, p])), [personnel]);
  const trainingMap = useMemo(() => new Map(trainings.map((t) => [t.id, t])), [trainings]);
  const kayitlarList = useMemo(() => {
    const rows = records
      .map((r) => ({
        r,
        p: personelMap.get(r.personnelId),
        t: trainingMap.get(r.trainingId),
      }))
      .filter(({ p, t }) => {
        if (!q) return true;
        const name = p ? `${p.ad} ${p.soyad}` : '';
        const egitim = t ? t.ad : '';
        return toUpperTR(name).includes(q) || toUpperTR(egitim).includes(q);
      });
    return rows.sort((a, b) => b.r.tarih.localeCompare(a.r.tarih));
  }, [records, personelMap, trainingMap, q]);

  const oturumlar = useMemo(() => computeOturumlar(records, trainings), [records, trainings]);
  const toplamAdamSaat = useMemo(() => totalAdamSaat(oturumlar), [oturumlar]);
  const aylikAdamSaat = useMemo(() => aggregateByMonth(oturumlar), [oturumlar]);
  const buAyToplamAdamSaat = aylikAdamSaat.find((m) => m.month === currentMonthKey)?.total ?? 0;

  const aralikOturumlari = useMemo(
    () =>
      oturumlar.filter(
        (s) => (!rangeStart || s.tarih >= rangeStart) && (!rangeEnd || s.tarih <= rangeEnd),
      ),
    [oturumlar, rangeStart, rangeEnd],
  );
  const aralikToplam = useMemo(() => totalAdamSaat(aralikOturumlari), [aralikOturumlari]);
  const aralikKategoriDagilimi = useMemo(
    () => aggregateByCategory(aralikOturumlari),
    [aralikOturumlari],
  );
  const aralikEgitimOzeti = useMemo(
    () => aggregateByTraining(aralikOturumlari),
    [aralikOturumlari],
  );
  const aralikEgitimByKategori = useMemo(() => {
    const map = new Map<string, typeof aralikEgitimOzeti>();
    for (const e of aralikEgitimOzeti) {
      if (!map.has(e.kategori)) map.set(e.kategori, []);
      map.get(e.kategori)!.push(e);
    }
    return map;
  }, [aralikEgitimOzeti]);
  const earliestTarih = useMemo(
    () => oturumlar.reduce((min, s) => (!min || s.tarih < min ? s.tarih : min), ''),
    [oturumlar],
  );
  const latestTarih = useMemo(
    () => oturumlar.reduce((max, s) => (!max || s.tarih > max ? s.tarih : max), ''),
    [oturumlar],
  );
  const projeAdamSaat = useMemo(() => {
    if (!projeBaslangicTarihi) return 0;
    return totalAdamSaat(oturumlar.filter((s) => s.tarih >= projeBaslangicTarihi));
  }, [oturumlar, projeBaslangicTarihi]);
  const son12Ay = useMemo(() => aylikAdamSaat.slice(-12), [aylikAdamSaat]);
  const son12AyMax = Math.max(1, ...son12Ay.map((m) => m.total));
  const kategoriMax = Math.max(1, ...aralikKategoriDagilimi.map((k) => k.total));

  const kategoriRollup = useMemo(() => {
    const tumKategoriler = [
      ...TRAINING_CATEGORIES,
      ...Array.from(aralikEgitimByKategori.keys()),
    ].filter((k, i, arr) => arr.indexOf(k) === i);
    return tumKategoriler
      .map((kategori) => {
        const egitimler = aralikEgitimByKategori.get(kategori) ?? [];
        return {
          kategori,
          egitimSayisi: egitimler.length,
          oturumSayisi: egitimler.reduce((sum, e) => sum + e.oturumSayisi, 0),
          toplamKisi: egitimler.reduce((sum, e) => sum + e.toplamKisi, 0),
          toplamAdamSaat: egitimler.reduce((sum, e) => sum + e.toplamAdamSaat, 0),
        };
      })
      .filter((k) => k.egitimSayisi > 0)
      .sort((a, b) => b.toplamAdamSaat - a.toplamAdamSaat);
  }, [aralikEgitimByKategori]);

  const kategoriFilterOptions = useMemo(
    () => ['all', ...kategoriRollup.map((k) => k.kategori)],
    [kategoriRollup],
  );
  const secilenKategoriEgitimleri =
    adamSaatKategoriFilter !== 'all'
      ? (aralikEgitimByKategori.get(adamSaatKategoriFilter) ?? [])
      : [];
  // Seçili kategoriye göre daralan oturum listesi — "Seçili Aralıktaki Eğitim
  // Oturumları" tablosu da kategori seçimine uysun diye.
  const aralikOturumlariGorunen =
    adamSaatKategoriFilter === 'all'
      ? aralikOturumlari
      : aralikOturumlari.filter((s) => s.kategori === adamSaatKategoriFilter);

  function handleAdamSaatExport() {
    if (adamSaatKategoriFilter === 'all') {
      const header = ['Kategori', 'Eğitim Sayısı', 'Oturum Sayısı', 'Toplam Kişi', 'Adam-Saat'];
      const aoa: (string | number)[][] = [header];
      kategoriRollup.forEach((k) => {
        aoa.push([k.kategori, k.egitimSayisi, k.oturumSayisi, k.toplamKisi, k.toplamAdamSaat]);
      });
      aoa.push([]);
      aoa.push(['', '', '', 'Toplam', aralikToplam]);
      downloadWorkbook(
        aoa,
        'Adam-Saat',
        `adam-saat-kategori-${rangeStart}_${rangeEnd}-${todayFileStamp()}.xlsx`,
      ).catch(() => toast.error('Excel dosyası indirilemedi. Lütfen tekrar deneyin.'));
      return;
    }
    const header = ['Eğitim Adı', 'Oturum Sayısı', 'Toplam Kişi', 'Adam-Saat'];
    const aoa: (string | number)[][] = [header];
    secilenKategoriEgitimleri.forEach((e) => {
      aoa.push([e.egitimAdi, e.oturumSayisi, e.toplamKisi, e.toplamAdamSaat]);
    });
    downloadWorkbook(
      aoa,
      'Adam-Saat',
      `adam-saat-${adamSaatKategoriFilter}-${rangeStart}_${rangeEnd}-${todayFileStamp()}.xlsx`,
    ).catch(() => toast.error('Excel dosyası indirilemedi. Lütfen tekrar deneyin.'));
  }

  const durumRows = useMemo(() => {
    if (detailView !== 'durum') return [];
    const egitimler =
      egitimFilter === 'all' ? trainings : trainings.filter((t) => t.id === egitimFilter);
    const rows: { p: Personel; t: Training; s: ReturnType<typeof statusFor> }[] = [];
    filteredPeople.forEach((p) => {
      egitimler.forEach((t) => {
        const s = statusFor(p.id, t.id, records, t);
        if (durumFilter !== 'all' && durumFilter !== s.code) return;
        rows.push({ p, t, s });
      });
    });
    return rows;
  }, [detailView, egitimFilter, durumFilter, trainings, filteredPeople, records]);

  if (!personnel.length || !trainings.length) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Gösterilecek veri yok. Önce personel ve eğitim ekleyin.
      </div>
    );
  }

  function openView(view: DetailView) {
    setSearch('');
    if (view !== 'durum') {
      setDurumFilter('all');
      setEgitimFilter('all');
    }
    setDetailView(view);
  }

  const cards: {
    label: string;
    num: number;
    view: DetailView;
    egitimDurum?: string;
    adamSaatRange?: 'ay' | 'tumu' | 'proje';
    icon: LucideIcon;
    tone?: 'danger' | 'warning';
  }[] = [
    {
      label: 'Güncel Personel',
      num: allPersonnelCount - cikisCount,
      view: 'guncelPersonel',
      icon: UsersIcon,
    },
    { label: 'Çıkış Personel', num: cikisCount, view: 'cikisPersonel', icon: UserMinusIcon },
    { label: 'Eğitim Türü', num: trainings.length, view: 'egitimTuru', icon: BookOpenIcon },
    { label: 'Toplam Kayıt', num: records.length, view: 'kayitlar', icon: ClipboardListIcon },
    {
      label: 'Süresi Dolan',
      num: expiredCount,
      view: 'durum',
      egitimDurum: 'expired',
      icon: TriangleAlertIcon,
      tone: 'danger',
    },
    {
      label: 'Yaklaşan (30g)',
      num: soonCount,
      view: 'durum',
      egitimDurum: 'soon',
      icon: ClockIcon,
      tone: 'warning',
    },
    {
      label: 'Toplam Adam-Saat',
      num: toplamAdamSaat,
      view: 'adamSaat',
      adamSaatRange: 'tumu',
      icon: TimerIcon,
    },
    {
      label: 'Proje Başından Beri Adam-Saat',
      num: projeAdamSaat,
      view: 'adamSaat',
      adamSaatRange: 'proje',
      icon: CalendarRangeIcon,
    },
    {
      label: 'Bu Ay Adam-Saat',
      num: buAyToplamAdamSaat,
      view: 'adamSaat',
      adamSaatRange: 'ay',
      icon: CalendarDaysIcon,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const tone = TONE_CLASSES[c.tone ?? 'primary'];
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                setSearch('');
                setDurumFilter(c.egitimDurum ?? 'all');
                setEgitimFilter('all');
                if (c.adamSaatRange === 'ay') {
                  setRangeStart(firstDayOfMonth(currentMonthKey));
                  setRangeEnd(lastDayOfMonth(currentMonthKey));
                } else if (c.adamSaatRange === 'tumu') {
                  setRangeStart(earliestTarih || firstDayOfMonth(currentMonthKey));
                  setRangeEnd(latestTarih || todayStr());
                } else if (c.adamSaatRange === 'proje') {
                  setRangeStart(
                    projeBaslangicTarihi || earliestTarih || firstDayOfMonth(currentMonthKey),
                  );
                  setRangeEnd(latestTarih || todayStr());
                }
                if (c.view === 'adamSaat') setAdamSaatKategoriFilter('all');
                setDetailView(c.view);
              }}
              className={cn(
                'group relative overflow-hidden rounded-lg border border-border bg-panel p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                tone.border,
              )}
            >
              <span className={cn('absolute inset-y-0 left-0 w-[3px]', tone.bar)} />
              <div className="flex items-start justify-between gap-2">
                <div className="font-heading text-3xl leading-none font-extrabold">{c.num}</div>
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-md',
                    tone.badge,
                  )}
                >
                  <Icon className="size-4" />
                </div>
              </div>
              <div className="mt-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                {c.label}
              </div>
            </button>
          );
        })}
      </div>

      {detailView !== 'none' && (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={() => openView('none')}>
              ← Geri
            </Button>
            {(detailView === 'guncelPersonel' ||
              detailView === 'cikisPersonel' ||
              detailView === 'egitimTuru' ||
              detailView === 'kayitlar' ||
              detailView === 'durum') && (
              <Input
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-64"
              />
            )}
            {detailView === 'durum' && (
              <>
                <Select value={egitimFilter} onValueChange={(v) => setEgitimFilter(v ?? 'all')}>
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
                <Select value={durumFilter} onValueChange={(v) => setDurumFilter(v ?? 'all')}>
                  <SelectTrigger className="w-44">
                    <SelectValue>{(v: string) => DURUM_LABELS[v] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DURUM_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {detailView === 'adamSaat' && (
              <>
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-40"
                  aria-label="Başlangıç tarihi"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-40"
                  aria-label="Bitiş tarihi"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRangeStart(firstDayOfMonth(currentMonthKey));
                    setRangeEnd(lastDayOfMonth(currentMonthKey));
                  }}
                >
                  Bu Ay
                </Button>
                <Select
                  value={adamSaatKategoriFilter}
                  onValueChange={(v) => setAdamSaatKategoriFilter(v ?? 'all')}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      {(v: string) => (v === 'all' ? 'Tüm kategoriler' : v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriFilterOptions.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k === 'all' ? 'Tüm kategoriler' : k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" onClick={handleAdamSaatExport}>
                  Excel İndir
                </Button>
              </>
            )}
          </div>

          {detailView === 'guncelPersonel' &&
            (!guncelPersonelList.length ? (
              <div className="p-10 text-center text-muted-foreground">Personel bulunamadı.</div>
            ) : (
              <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>TC No</TableHead>
                    <TableHead>Görev</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Çalışma Şekli</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guncelPersonelList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.ad} {p.soyad}
                      </TableCell>
                      <TableCell className="font-mono">{p.tcNo || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{p.gorev || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.calismaSekli || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}

          {detailView === 'cikisPersonel' &&
            (!cikisPersonelList.length ? (
              <div className="p-10 text-center text-muted-foreground">Personel bulunamadı.</div>
            ) : (
              <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>TC No</TableHead>
                    <TableHead>Görev</TableHead>
                    <TableHead>Firma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cikisPersonelList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.ad} {p.soyad}
                      </TableCell>
                      <TableCell className="font-mono">{p.tcNo || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{p.gorev || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}

          {detailView === 'egitimTuru' &&
            (!egitimTuruList.length ? (
              <div className="p-10 text-center text-muted-foreground">Eğitim bulunamadı.</div>
            ) : (
              <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Eğitim Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Geçerlilik (Ay)</TableHead>
                    <TableHead>Kayıt Sayısı</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {egitimTuruList.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.ad}</TableCell>
                      <TableCell className="text-muted-foreground">{t.kategori}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {t.gecerlilikAy || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {trainingCountMap.get(t.id) ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}

          {detailView === 'kayitlar' &&
            (!kayitlarList.length ? (
              <div className="p-10 text-center text-muted-foreground">Kayıt bulunamadı.</div>
            ) : (
              <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Sonuç</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kayitlarList.map(({ r, p, t }, i) => (
                    <TableRow key={`${r.personnelId}-${r.trainingId}-${i}`}>
                      <TableCell>{p ? `${p.ad} ${p.soyad}` : '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{t ? t.ad : '-'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {fmtDate(r.tarih)}
                      </TableCell>
                      <TableCell>
                        <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}

          {detailView === 'durum' &&
            (!durumRows.length ? (
              <div className="p-10 text-center text-muted-foreground">
                Bu filtreye uyan kayıt yok
                {durumFilter !== 'all' ? ` (${DURUM_LABELS[durumFilter]})` : ''}.
              </div>
            ) : (
              <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead>Firma</TableHead>
                    <TableHead>Eğitim</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Son Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {durumRows.map(({ p, t, s }, i) => (
                    <TableRow key={`${p.id}-${t.id}-${i}`}>
                      <TableCell>
                        {p.ad} {p.soyad}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
                      <TableCell>{t.ad}</TableCell>
                      <TableCell>
                        <span className={`tag ${tagClassFor(s.code)}`}>{s.label}</span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {s.tarih ? fmtDate(s.tarih) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}

          {detailView === 'adamSaat' && (
            <div className="space-y-5">
              <div className="rounded-lg border border-border border-l-3 border-l-primary bg-panel p-4">
                <div className="font-heading text-3xl leading-none font-extrabold">
                  {aralikToplam.toLocaleString('tr-TR')}
                </div>
                <div className="mt-1.5 text-xs tracking-wide text-muted-foreground uppercase">
                  {fmtDate(rangeStart)} — {fmtDate(rangeEnd)} Toplam Adam-Saat
                </div>
              </div>

              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Kategoriye Göre Dağılım
                </h3>
                {!aralikKategoriDagilimi.length ? (
                  <p className="text-sm text-muted-foreground">
                    Seçili tarih aralığında kayıt yok.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {aralikKategoriDagilimi.map((k) => (
                      <div key={k.kategori} className="flex items-center gap-2.5">
                        <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                          {k.kategori}
                        </span>
                        <div className="h-5 flex-1 rounded bg-panel-2">
                          <div
                            className="h-5 rounded bg-primary"
                            style={{ width: `${(k.total / kategoriMax) * 100}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right font-mono text-xs">
                          {k.total.toLocaleString('tr-TR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Son 12 Ay Trend
                </h3>
                {!son12Ay.length ? (
                  <p className="text-sm text-muted-foreground">Henüz veri yok.</p>
                ) : (
                  <div className="space-y-2">
                    {son12Ay.map((m) => {
                      const inRange =
                        m.month >= rangeStart.slice(0, 7) && m.month <= rangeEnd.slice(0, 7);
                      return (
                        <div key={m.month} className="flex items-center gap-2.5">
                          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                            {m.month}
                          </span>
                          <div className="h-5 flex-1 rounded bg-panel-2">
                            <div
                              className={`h-5 rounded ${inRange ? 'bg-primary' : 'border border-primary/40'}`}
                              style={{ width: `${(m.total / son12AyMax) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right font-mono text-xs">
                            {m.total.toLocaleString('tr-TR')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Kategori Bazında Adam-Saat
                  </h3>
                  {adamSaatKategoriFilter !== 'all' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAdamSaatKategoriFilter('all')}
                    >
                      Tüm Kategoriler
                    </Button>
                  )}
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Bir kategoriye tıklayınca altta o kategorideki eğitimler ayrı ayrı listelenir.
                </p>
                {!kategoriRollup.length ? (
                  <p className="text-sm text-muted-foreground">
                    Seçili tarih aralığında kayıt yok.
                  </p>
                ) : (
                  <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Eğitim Sayısı</TableHead>
                        <TableHead>Oturum Sayısı</TableHead>
                        <TableHead>Toplam Kişi</TableHead>
                        <TableHead>Adam-Saat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kategoriRollup.map((k) => (
                        <TableRow
                          key={k.kategori}
                          className={`cursor-pointer hover:bg-panel-2 ${adamSaatKategoriFilter === k.kategori ? 'bg-panel-2' : ''}`}
                          onClick={() =>
                            setAdamSaatKategoriFilter((cur) =>
                              cur === k.kategori ? 'all' : k.kategori,
                            )
                          }
                        >
                          <TableCell className="font-semibold text-primary">{k.kategori}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {k.egitimSayisi}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {k.oturumSayisi}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {k.toplamKisi}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {k.toplamAdamSaat.toLocaleString('tr-TR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>

              {adamSaatKategoriFilter !== 'all' && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {adamSaatKategoriFilter} — Eğitim Bazında Adam-Saat
                  </h3>
                  {!secilenKategoriEgitimleri.length ? (
                    <p className="text-sm text-muted-foreground">
                      Bu kategoride seçili tarih aralığında kayıt yok.
                    </p>
                  ) : (
                    <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Eğitim Adı</TableHead>
                          <TableHead>Oturum Sayısı</TableHead>
                          <TableHead>Toplam Kişi</TableHead>
                          <TableHead>Adam-Saat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {secilenKategoriEgitimleri.map((e) => (
                          <TableRow key={e.trainingId}>
                            <TableCell>{e.egitimAdi}</TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {e.oturumSayisi}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {e.toplamKisi}
                            </TableCell>
                            <TableCell className="font-mono font-semibold">
                              {e.toplamAdamSaat.toLocaleString('tr-TR')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </section>
              )}

              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Seçili Aralıktaki Eğitim Oturumları
                  {adamSaatKategoriFilter !== 'all' ? ` — ${adamSaatKategoriFilter}` : ''}
                </h3>
                {!aralikOturumlariGorunen.length ? (
                  <p className="text-sm text-muted-foreground">Seçili aralıkta oturum yok.</p>
                ) : (
                  <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Eğitim</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Kişi Sayısı</TableHead>
                        <TableHead>Süre (Saat)</TableHead>
                        <TableHead>Adam-Saat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aralikOturumlariGorunen.map((s, i) => (
                        <TableRow key={`${s.trainingId}-${s.tarih}-${i}`}>
                          <TableCell className="font-mono text-muted-foreground">
                            {fmtDate(s.tarih)}
                          </TableCell>
                          <TableCell>{s.egitimAdi}</TableCell>
                          <TableCell className="text-muted-foreground">{s.kategori}</TableCell>
                          <TableCell className="font-mono">{s.kisiSayisi}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {s.egitimSuresi}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">{s.adamSaat}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function tagClassFor(code: TrainingStatusCode) {
  if (code === 'expired') return 'tag-bad';
  if (code === 'soon') return 'tag-warn';
  if (code === 'valid') return 'tag-ok';
  return 'tag-none';
}

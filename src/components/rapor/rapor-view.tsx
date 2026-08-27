'use client';

import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { statusFor, todayStr, daysInMonth } from '@/lib/training-status';
import { computeOturumlar, totalAdamSaat, aggregateByMonth, monthKeyOf } from '@/lib/adam-saat';
import { toUpperTR } from '@/lib/utils';
import type { DetailView, Personel, Rec, Training } from './types';
import { SummaryCards, type SummaryCard } from './summary-cards';
import { PersonelListTable } from './personel-list-table';
import { EgitimTuruTable } from './egitim-turu-table';
import { KayitlarTable } from './kayitlar-table';
import { DurumTable } from './durum-table';
import { AdamSaatToolbar } from './adam-saat-toolbar';
import { AdamSaatContent } from './adam-saat-content';
import { useAdamSaatReport } from './use-adam-saat-report';

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

  const adamSaatReport = useAdamSaatReport(
    oturumlar,
    aylikAdamSaat,
    rangeStart,
    rangeEnd,
    adamSaatKategoriFilter,
  );

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

  const cards: SummaryCard[] = [
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

  function handleCardClick(c: SummaryCard) {
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
      setRangeStart(projeBaslangicTarihi || earliestTarih || firstDayOfMonth(currentMonthKey));
      setRangeEnd(latestTarih || todayStr());
    }
    if (c.view === 'adamSaat') setAdamSaatKategoriFilter('all');
    setDetailView(c.view);
  }

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

  return (
    <div className="space-y-4">
      <SummaryCards cards={cards} onCardClick={handleCardClick} />

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
              <AdamSaatToolbar
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onRangeStartChange={setRangeStart}
                onRangeEndChange={setRangeEnd}
                onThisMonth={() => {
                  setRangeStart(firstDayOfMonth(currentMonthKey));
                  setRangeEnd(lastDayOfMonth(currentMonthKey));
                }}
                kategoriFilterOptions={adamSaatReport.kategoriFilterOptions}
                adamSaatKategoriFilter={adamSaatKategoriFilter}
                onKategoriChange={setAdamSaatKategoriFilter}
                onExport={adamSaatReport.handleExport}
              />
            )}
          </div>

          {detailView === 'guncelPersonel' && (
            <PersonelListTable people={guncelPersonelList} showCalismaSekli />
          )}

          {detailView === 'cikisPersonel' && (
            <PersonelListTable people={cikisPersonelList} showCalismaSekli={false} />
          )}

          {detailView === 'egitimTuru' && (
            <EgitimTuruTable trainings={egitimTuruList} trainingCountMap={trainingCountMap} />
          )}

          {detailView === 'kayitlar' && <KayitlarTable rows={kayitlarList} />}

          {detailView === 'durum' && (
            <DurumTable
              rows={durumRows}
              emptyLabel={`Bu filtreye uyan kayıt yok${
                durumFilter !== 'all' ? ` (${DURUM_LABELS[durumFilter]})` : ''
              }.`}
            />
          )}

          {detailView === 'adamSaat' && (
            <AdamSaatContent
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              aralikToplam={adamSaatReport.aralikToplam}
              aralikKategoriDagilimi={adamSaatReport.aralikKategoriDagilimi}
              kategoriMax={adamSaatReport.kategoriMax}
              son12Ay={adamSaatReport.son12Ay}
              son12AyMax={adamSaatReport.son12AyMax}
              kategoriRollup={adamSaatReport.kategoriRollup}
              adamSaatKategoriFilter={adamSaatKategoriFilter}
              onKategoriChange={setAdamSaatKategoriFilter}
              secilenKategoriEgitimleri={adamSaatReport.secilenKategoriEgitimleri}
              aralikOturumlariGorunen={adamSaatReport.aralikOturumlariGorunen}
            />
          )}
        </>
      )}
    </div>
  );
}

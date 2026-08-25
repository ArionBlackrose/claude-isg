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
import { StatusTag } from '@/components/ui/status-tag';
import { statusFor, fmtDate, toneForTrainingStatus } from '@/lib/training-status';

type Personel = { id: string; ad: string; soyad: string; firma: string | null };
type Training = { id: string; ad: string; gecerlilikAy: number };
type Rec = {
  personnelId: string;
  trainingId: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
};

const DURUM_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tüm durumlar' },
  { value: 'expired', label: 'Süresi Doldu' },
  { value: 'soon', label: 'Yaklaşıyor (30g)' },
  { value: 'valid', label: 'Geçerli' },
  { value: 'none', label: 'Almadı' },
];
const DURUM_LABELS = Object.fromEntries(DURUM_OPTIONS.map((o) => [o.value, o.label]));

export function RaporView({
  personnel,
  allPersonnelCount,
  cikisCount,
  trainings,
  records,
  initialEgitim,
  initialDurum,
}: {
  personnel: Personel[];
  allPersonnelCount: number;
  cikisCount: number;
  trainings: Training[];
  records: Rec[];
  initialEgitim: string;
  initialDurum: string;
}) {
  const [search, setSearch] = useState('');
  const [egitimFilter, setEgitimFilter] = useState(initialEgitim);
  const [durumFilter, setDurumFilter] = useState(initialDurum);

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

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personnel;
    return personnel.filter((p) => `${p.ad} ${p.soyad}`.toLowerCase().includes(q));
  }, [personnel, search]);

  const isFiltered = egitimFilter !== 'all' || durumFilter !== 'all';

  const filteredRows = useMemo(() => {
    if (!isFiltered) return [];
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
  }, [isFiltered, egitimFilter, durumFilter, trainings, filteredPeople, records]);

  if (!personnel.length || !trainings.length) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Gösterilecek veri yok. Önce personel ve eğitim ekleyin.
      </div>
    );
  }

  const cards: { label: string; num: number; onClick?: () => void }[] = [
    { label: 'Güncel Personel', num: allPersonnelCount - cikisCount },
    { label: 'Çıkış Personel', num: cikisCount },
    { label: 'Eğitim Türü', num: trainings.length },
    { label: 'Toplam Kayıt', num: records.length },
    {
      label: 'Süresi Dolan',
      num: expiredCount,
      onClick: () => {
        setDurumFilter('expired');
        setEgitimFilter('all');
      },
    },
    {
      label: 'Yaklaşan (30g)',
      num: soonCount,
      onClick: () => {
        setDurumFilter('soon');
        setEgitimFilter('all');
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.onClick}
            disabled={!c.onClick}
            className="rounded-lg border border-border border-l-3 border-l-primary bg-panel p-4 text-left disabled:cursor-default"
          >
            <div className="font-heading text-3xl leading-none font-extrabold">{c.num}</div>
            <div className="mt-1.5 text-xs tracking-wide text-muted-foreground uppercase">
              {c.label}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Input
          placeholder="Personel ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
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
      </div>

      {isFiltered ? (
        !filteredRows.length ? (
          <div className="p-10 text-center text-muted-foreground">
            Bu filtreye uyan kayıt yok
            {durumFilter !== 'all' ? ` (${DURUM_LABELS[durumFilter]})` : ''}.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredRows.length} sonuç
              {durumFilter !== 'all' && (
                <>
                  {' — '}
                  <b className="text-foreground">{DURUM_LABELS[durumFilter]}</b>
                </>
              )}
              {egitimFilter !== 'all' && (
                <>
                  {' — '}
                  <b className="text-foreground">{egitimLabels[egitimFilter]}</b>
                </>
              )}
            </p>
            <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
              <Table>
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
                  {filteredRows.map(({ p, t, s }, i) => (
                    <TableRow key={`${p.id}-${t.id}-${i}`}>
                      <TableCell>
                        {p.ad} {p.soyad}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
                      <TableCell>{t.ad}</TableCell>
                      <TableCell>
                        <StatusTag tone={toneForTrainingStatus(s.code)}>{s.label}</StatusTag>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {s.tarih ? fmtDate(s.tarih) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel</TableHead>
                <TableHead>Firma</TableHead>
                {trainings.map((t) => (
                  <TableHead key={t.id}>{t.ad}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeople.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.ad} {p.soyad}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
                  {trainings.map((t) => {
                    const s = statusFor(p.id, t.id, records, t);
                    return (
                      <TableCell key={t.id}>
                        <StatusTag
                          tone={toneForTrainingStatus(s.code)}
                          title={s.tarih ? fmtDate(s.tarih) : ''}
                        >
                          {s.code === 'valid' ? fmtDate(s.label) : s.label}
                        </StatusTag>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

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
import { statusFor } from '@/lib/training-status';
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
  not: string | null;
  driveWebViewLink: string | null;
};

const DURUM_FILTER_LABELS: Record<string, string> = {
  all: 'Tüm durumlar',
  Güncel: 'Güncel',
  Çıkış: 'Çıkış',
};

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}

export function LogTable({
  personnel,
  trainings,
  records,
}: {
  personnel: LogPersonel[];
  trainings: LogTraining[];
  records: LogRecord[];
}) {
  const [search, setSearch] = useState('');
  const [durumFilter, setDurumFilter] = useState('all');
  const [editing, setEditing] = useState<{ personnelId: string; trainingId: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return personnel.filter((p) => {
      if (durumFilter !== 'all' && p.durum !== durumFilter) return false;
      if (q && !`${p.ad} ${p.soyad} ${p.tcNo ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [personnel, search, durumFilter]);

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
    personnel.forEach((p, i) => {
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
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
        <Select value={durumFilter} onValueChange={(v) => setDurumFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => DURUM_FILTER_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="Güncel">Güncel</SelectItem>
            <SelectItem value="Çıkış">Çıkış</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          Excel İndir (Yedek)
        </Button>
      </div>
      {!filtered.length ? (
        <div className="p-10 text-center text-muted-foreground">Kayıt bulunamadı.</div>
      ) : (
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
              {filtered.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
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
                          className={`tag ${s.code === 'expired' ? 'tag-bad' : s.code === 'soon' ? 'tag-warn' : s.code === 'valid' ? 'tag-ok' : 'tag-none'} cursor-pointer`}
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
        />
      )}
    </div>
  );
}

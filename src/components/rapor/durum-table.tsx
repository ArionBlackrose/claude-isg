import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusTag } from '@/components/ui/status-tag';
import { fmtDate, toneForTrainingStatus } from '@/lib/training-status';
import type { Personel, PersonelDurumu, Training } from './types';

export function DurumTable({
  rows,
  emptyLabel,
}: {
  rows: { p: Personel; t: Training; s: PersonelDurumu }[];
  emptyLabel: string;
}) {
  if (!rows.length) {
    return <div className="p-10 text-center text-muted-foreground">{emptyLabel}</div>;
  }
  return (
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
        {rows.map(({ p, t, s }, i) => (
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
  );
}

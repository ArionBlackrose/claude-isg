import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusTag } from '@/components/ui/status-tag';
import { fmtDate, toneForSonuc } from '@/lib/training-status';
import type { Personel, Rec, Training } from './types';

export function KayitlarTable({
  rows,
}: {
  rows: { r: Rec; p: Personel | undefined; t: Training | undefined }[];
}) {
  if (!rows.length) {
    return <div className="p-10 text-center text-muted-foreground">Kayıt bulunamadı.</div>;
  }
  return (
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
        {rows.map(({ r, p, t }, i) => (
          <TableRow key={`${r.personnelId}-${r.trainingId}-${i}`}>
            <TableCell>{p ? `${p.ad} ${p.soyad}` : '-'}</TableCell>
            <TableCell className="text-muted-foreground">{t ? t.ad : '-'}</TableCell>
            <TableCell className="font-mono text-muted-foreground">{fmtDate(r.tarih)}</TableCell>
            <TableCell>
              <StatusTag tone={toneForSonuc(r.sonuc)}>{r.sonuc}</StatusTag>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

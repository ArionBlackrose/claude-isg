import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Personel } from './types';

export function PersonelListTable({
  people,
  showCalismaSekli,
}: {
  people: Personel[];
  showCalismaSekli: boolean;
}) {
  if (!people.length) {
    return <div className="p-10 text-center text-muted-foreground">Personel bulunamadı.</div>;
  }
  return (
    <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
      <TableHeader>
        <TableRow>
          <TableHead>Ad Soyad</TableHead>
          <TableHead>TC No</TableHead>
          <TableHead>Görev</TableHead>
          <TableHead>Firma</TableHead>
          {showCalismaSekli && <TableHead>Çalışma Şekli</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              {p.ad} {p.soyad}
            </TableCell>
            <TableCell className="font-mono">{p.tcNo || '-'}</TableCell>
            <TableCell className="text-muted-foreground">{p.gorev || '-'}</TableCell>
            <TableCell className="text-muted-foreground">{p.firma || '-'}</TableCell>
            {showCalismaSekli && (
              <TableCell className="text-muted-foreground">{p.calismaSekli || '-'}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Training } from './types';

export function EgitimTuruTable({
  trainings,
  trainingCountMap,
}: {
  trainings: Training[];
  trainingCountMap: Map<string, number>;
}) {
  if (!trainings.length) {
    return <div className="p-10 text-center text-muted-foreground">Eğitim bulunamadı.</div>;
  }
  return (
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
        {trainings.map((t) => (
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
  );
}

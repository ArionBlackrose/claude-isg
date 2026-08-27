import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AdamSaatToolbar({
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  onThisMonth,
  kategoriFilterOptions,
  adamSaatKategoriFilter,
  onKategoriChange,
  onExport,
}: {
  rangeStart: string;
  rangeEnd: string;
  onRangeStartChange: (value: string) => void;
  onRangeEndChange: (value: string) => void;
  onThisMonth: () => void;
  kategoriFilterOptions: string[];
  adamSaatKategoriFilter: string;
  onKategoriChange: (value: string) => void;
  onExport: () => void;
}) {
  return (
    <>
      <Input
        type="date"
        value={rangeStart}
        onChange={(e) => onRangeStartChange(e.target.value)}
        className="w-40"
        aria-label="Başlangıç tarihi"
      />
      <span className="text-xs text-muted-foreground">—</span>
      <Input
        type="date"
        value={rangeEnd}
        onChange={(e) => onRangeEndChange(e.target.value)}
        className="w-40"
        aria-label="Bitiş tarihi"
      />
      <Button type="button" variant="outline" size="sm" onClick={onThisMonth}>
        Bu Ay
      </Button>
      <Select value={adamSaatKategoriFilter} onValueChange={(v) => onKategoriChange(v ?? 'all')}>
        <SelectTrigger className="w-48">
          <SelectValue>{(v: string) => (v === 'all' ? 'Tüm kategoriler' : v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {kategoriFilterOptions.map((k) => (
            <SelectItem key={k} value={k}>
              {k === 'all' ? 'Tüm kategoriler' : k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={onExport}>
        Excel İndir
      </Button>
    </>
  );
}

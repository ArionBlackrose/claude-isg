'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toUpperTR } from '@/lib/utils';

type PersonelOption = {
  id: string;
  ad: string;
  soyad: string;
  firma: string | null;
  tcNo?: string | null;
};

/** KayitForm ve SahaEgitimiForm arasında paylaşılan aranabilir personel
 * çoklu-seçim listesi — arama kutusu + kaydırılabilir checkbox listesi.
 * `personnel.tcNo` verilmişse arama TC No'yu da eşleştirir. */
export function PersonnelMultiSelect({
  personnel,
  selectedIds,
  onToggle,
  searchPlaceholder = 'Ad, soyad ile arayın...',
}: {
  personnel: PersonelOption[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = toUpperTR(search);
    if (!q) return personnel;
    return personnel.filter((p) => toUpperTR(`${p.ad} ${p.soyad} ${p.tcNo ?? ''}`).includes(q));
  }, [personnel, search]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>Personel {selectedIds.size > 0 && `(${selectedIds.size} seçili)`}</Label>
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
      />
      <div className="max-h-52 space-y-0.5 overflow-auto rounded-md border border-border bg-panel-2 p-1.5">
        {filtered.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Sonuç bulunamadı</p>
        )}
        {filtered.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(p.id)}
              onChange={() => onToggle(p.id)}
              className="accent-primary"
            />
            <span>
              {p.ad} {p.soyad}
              {p.firma ? ` — ${p.firma}` : ''}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

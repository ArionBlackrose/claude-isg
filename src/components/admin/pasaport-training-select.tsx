'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updatePasaportTrainings } from '@/actions/training';

export type PasaportTrainingRow = {
  id: string;
  ad: string;
  kategori: string;
  pasaportGoster: boolean;
};

export function PasaportTrainingSelect({ trainings }: { trainings: PasaportTrainingRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(trainings.filter((t) => t.pasaportGoster).map((t) => t.id)),
  );
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return trainings;
    return trainings.filter(
      (t) =>
        t.ad.toLocaleLowerCase('tr-TR').includes(q) ||
        t.kategori.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [trainings, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await updatePasaportTrainings(Array.from(selected));
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Eğitim Pasaportu seçimi güncellendi.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Eğitim adı veya kategoriyle arayın..."
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground">
          {selected.size} / {trainings.length} eğitim seçili
        </span>
        <Button type="button" size="sm" disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Kaydediliyor...' : 'Seçimi Kaydet'}
        </Button>
      </div>
      <div className="max-h-96 space-y-0.5 overflow-auto rounded-lg border border-border bg-panel-2 p-1.5">
        {filtered.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Sonuç bulunamadı.</p>
        )}
        {filtered.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel"
          >
            <input
              type="checkbox"
              checked={selected.has(t.id)}
              onChange={() => toggle(t.id)}
              className="accent-primary"
            />
            <span>{t.ad}</span>
            <span className="text-xs text-muted-foreground">({t.kategori})</span>
          </label>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTraining } from '@/actions/training';

export function QuickAddTraining({
  onCreated,
}: {
  onCreated: (t: { id: string; ad: string }) => void;
}) {
  const [ad, setAd] = useState('');
  const [kategori, setKategori] = useState('');
  const [gecerlilikAy, setGecerlilikAy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    if (!ad.trim()) {
      toast.error('Eğitim adı zorunlu.');
      return;
    }
    setIsSubmitting(true);
    const result = await createTraining({
      ad,
      kategori: kategori || 'Genel',
      gecerlilikAy: Number(gecerlilikAy) || 0,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${ad}" eğitim türü eklendi ve seçildi.`);
    onCreated({ id: result.id, ad });
    setAd('');
    setKategori('');
    setGecerlilikAy('');
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-primary/3 p-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Eğitim Adı</Label>
          <Input value={ad} onChange={(e) => setAd(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Kategori</Label>
          <Input
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            placeholder="Genel / Özel / Uyarı"
          />
        </div>
        <div className="space-y-1">
          <Label>Geçerlilik (ay)</Label>
          <Input
            type="number"
            min={0}
            value={gecerlilikAy}
            onChange={(e) => setGecerlilikAy(e.target.value)}
            placeholder="0 = süresiz"
          />
        </div>
      </div>
      <Button type="button" size="sm" className="mt-3" disabled={isSubmitting} onClick={handleSave}>
        {isSubmitting ? 'Kaydediliyor...' : 'Eğitimi Kaydet'}
      </Button>
    </div>
  );
}

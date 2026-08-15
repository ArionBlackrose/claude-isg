'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTraining } from '@/actions/training';
import { TRAINING_CATEGORIES, type TrainingInput } from '@/schemas/training';

export function QuickAddTraining({
  onCreated,
}: {
  onCreated: (t: { id: string; ad: string }) => void;
}) {
  const [ad, setAd] = useState('');
  const [kategori, setKategori] = useState<TrainingInput['kategori']>('Genel');
  const [gecerlilikAy, setGecerlilikAy] = useState('');
  const [egitimSuresi, setEgitimSuresi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    if (!ad.trim()) {
      toast.error('Eğitim adı zorunlu.');
      return;
    }
    setIsSubmitting(true);
    const result = await createTraining({
      ad,
      kategori,
      gecerlilikAy: Number(gecerlilikAy) || 0,
      egitimSuresi: Number(egitimSuresi) || 0,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${ad}" eğitim türü eklendi ve seçildi.`);
    onCreated({ id: result.id, ad });
    setAd('');
    setKategori('Genel');
    setGecerlilikAy('');
    setEgitimSuresi('');
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-primary/3 p-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label>Eğitim Adı</Label>
          <Input value={ad} onChange={(e) => setAd(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Kategori</Label>
          <Select
            value={kategori}
            onValueChange={(v) => setKategori((v as TrainingInput['kategori']) ?? 'Genel')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_CATEGORIES.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="space-y-1">
          <Label>Eğitim Süresi (saat)</Label>
          <Input
            type="number"
            min={0}
            value={egitimSuresi}
            onChange={(e) => setEgitimSuresi(e.target.value)}
            placeholder="0 = belirtilmedi"
          />
        </div>
      </div>
      <Button type="button" size="sm" className="mt-3" disabled={isSubmitting} onClick={handleSave}>
        {isSubmitting ? 'Kaydediliyor...' : 'Eğitimi Kaydet'}
      </Button>
    </div>
  );
}

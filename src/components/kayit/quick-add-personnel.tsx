'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPersonnel } from '@/actions/personnel';

export function QuickAddPersonnel({
  onCreated,
}: {
  onCreated: (p: {
    id: string;
    ad: string;
    soyad: string;
    tcNo: string | null;
    firma: string | null;
  }) => void;
}) {
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [gorev, setGorev] = useState('');
  const [firma, setFirma] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    if (!ad.trim() || !soyad.trim()) {
      toast.error('Ad ve soyad zorunlu.');
      return;
    }
    setIsSubmitting(true);
    const result = await createPersonnel({ ad, soyad, tcNo, gorev, firma });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${ad} ${soyad}" eklendi ve seçildi.`);
    onCreated({ id: result.id, ad, soyad, tcNo: tcNo || null, firma: firma || null });
    setAd('');
    setSoyad('');
    setTcNo('');
    setGorev('');
    setFirma('');
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-primary/3 p-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label>TC No</Label>
          <Input
            value={tcNo}
            onChange={(e) => setTcNo(e.target.value)}
            placeholder="11 haneli"
            inputMode="numeric"
            maxLength={11}
          />
        </div>
        <div className="space-y-1">
          <Label>Ad</Label>
          <Input value={ad} onChange={(e) => setAd(e.target.value)} maxLength={50} />
        </div>
        <div className="space-y-1">
          <Label>Soyad</Label>
          <Input value={soyad} onChange={(e) => setSoyad(e.target.value)} maxLength={50} />
        </div>
        <div className="space-y-1">
          <Label>Görev</Label>
          <Input value={gorev} onChange={(e) => setGorev(e.target.value)} maxLength={50} />
        </div>
        <div className="space-y-1">
          <Label>Firma</Label>
          <Input value={firma} onChange={(e) => setFirma(e.target.value)} maxLength={100} />
        </div>
      </div>
      <Button type="button" size="sm" className="mt-3" disabled={isSubmitting} onClick={handleSave}>
        {isSubmitting ? 'Kaydediliyor...' : 'Personeli Kaydet'}
      </Button>
    </div>
  );
}

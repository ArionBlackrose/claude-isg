'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createRecord } from '@/actions/records';
import { QuickAddPersonnel } from './quick-add-personnel';
import { QuickAddTraining } from './quick-add-training';

type PersonelOption = {
  id: string;
  ad: string;
  soyad: string;
  tcNo: string | null;
  firma: string | null;
};
type TrainingOption = { id: string; ad: string };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function KayitForm({
  personnel,
  trainings,
}: {
  personnel: PersonelOption[];
  trainings: TrainingOption[];
}) {
  const router = useRouter();
  const [personList, setPersonList] = useState(personnel);
  const [trainingList, setTrainingList] = useState(trainings);

  const [personSearch, setPersonSearch] = useState('');
  const [personnelId, setPersonnelId] = useState('');
  const [trainingId, setTrainingId] = useState('');
  const [tarih, setTarih] = useState(todayStr());
  const [sonuc, setSonuc] = useState<'Başarılı' | 'Başarısız' | 'Katılmadı'>('Başarılı');
  const [not, setNot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddPersonel, setShowAddPersonel] = useState(false);
  const [showAddEgitim, setShowAddEgitim] = useState(false);

  const filteredPersonel = useMemo(() => {
    const q = personSearch.trim().toLocaleUpperCase('tr-TR');
    let list = personList;
    if (q) {
      list = list.filter((p) =>
        `${p.ad} ${p.soyad} ${p.tcNo ?? ''}`.toLocaleUpperCase('tr-TR').includes(q),
      );
    }
    return list.slice(0, 200);
  }, [personList, personSearch]);

  async function handleSubmit() {
    if (!personnelId || !trainingId || !tarih) {
      toast.error('Lütfen personel, eğitim ve tarih alanlarını doldurun.');
      return;
    }
    setIsSubmitting(true);
    const result = await createRecord({ personnelId, trainingId, tarih, sonuc, not });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Kayıt eklendi.');
    setNot('');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Personel</Label>
          <Input
            value={personSearch}
            onChange={(e) => setPersonSearch(e.target.value)}
            placeholder="Ad, soyad veya TC ile arayın..."
            className="mb-1.5"
          />
          <Select value={personnelId} onValueChange={(v) => setPersonnelId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Önce yukarıdan arayın">
                {(v: string | null) => {
                  const p = personList.find((x) => x.id === v);
                  return p ? `${p.ad} ${p.soyad} — ${p.firma || ''}` : 'Önce yukarıdan arayın';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredPersonel.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Sonuç bulunamadı</div>
              )}
              {filteredPersonel.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.ad} {p.soyad} — {p.firma || ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Eğitim</Label>
          <Select value={trainingId} onValueChange={(v) => setTrainingId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seçiniz...">
                {(v: string | null) => trainingList.find((t) => t.id === v)?.ad ?? 'Seçiniz...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {trainingList.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.ad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tarih</Label>
          <Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sonuç</Label>
          <Select value={sonuc} onValueChange={(v) => setSonuc((v as typeof sonuc) ?? 'Başarılı')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Başarılı">Başarılı</SelectItem>
              <SelectItem value="Başarısız">Başarısız</SelectItem>
              <SelectItem value="Katılmadı">Katılmadı</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Not (opsiyonel)</Label>
        <Input
          value={not}
          onChange={(e) => setNot(e.target.value)}
          placeholder="Sertifika no, açıklama vb."
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Kaydediliyor...' : 'Kaydı Ekle'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddPersonel((v) => !v)}
        >
          + Yeni Personel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddEgitim((v) => !v)}
        >
          + Yeni Eğitim Türü
        </Button>
      </div>

      {showAddPersonel && (
        <QuickAddPersonnel
          onCreated={(p) => {
            setPersonList((list) => [...list, p]);
            setPersonSearch(`${p.ad} ${p.soyad}`);
            setPersonnelId(p.id);
            setShowAddPersonel(false);
          }}
        />
      )}
      {showAddEgitim && (
        <QuickAddTraining
          onCreated={(t) => {
            setTrainingList((list) => [...list, t]);
            setTrainingId(t.id);
            setShowAddEgitim(false);
          }}
        />
      )}
    </div>
  );
}

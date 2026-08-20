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
import { createRecords, type RecordsBatchResult } from '@/actions/records';
import { todayStr } from '@/lib/training-status';
import { isDosyaNoRequired } from '@/lib/training-category-rules';
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

export function KayitForm({
  personnel,
  trainings,
  submitAction = createRecords,
  quickAddExcludeCategories,
  hideQuickAdd = false,
  mode = 'general',
}: {
  personnel: PersonelOption[];
  trainings: TrainingOption[];
  /** Varsayılan olarak genel `createRecords` action'ı kullanılır — Uyarı
   * Eğitimleri paneli bunun yerine `createUyariRecords`'u geçer. */
  submitAction?: (input: unknown) => Promise<RecordsBatchResult>;
  /** "+ Yeni Eğitim Türü" hızlı ekleme formunda seçilemeyecek kategoriler —
   * ör. Eğitim Ekle sayfası Uyarı'yı hariç tutar, aksi halde burada
   * oluşturulan bir Uyarı eğitimi otomatik seçilir ama kayıt gönderimi
   * sunucu tarafında reddedilir. */
  quickAddExcludeCategories?: string[];
  /** "+ Yeni Personel" / "+ Yeni Eğitim Türü" hızlı ekleme butonlarını
   * gizler — Uyarı Eğitimleri paneli bu formu sadece mevcut personel/eğitim
   * türleriyle sınırlı tutmak için kullanır. */
  hideQuickAdd?: boolean;
  /** "uyari" modunda Sonuç seçenekleri Katıldı/Katılmadı olur, Tarih alanı
   * "gönderildiği tarih" olarak etiketlenir ve Katıldı seçildiğinde ayrı bir
   * "Katılım Tarihi" alanı zorunlu hale gelir. */
  mode?: 'general' | 'uyari';
}) {
  const router = useRouter();
  const [personList, setPersonList] = useState(personnel);
  const [trainingList, setTrainingList] = useState(trainings);

  const [personSearch, setPersonSearch] = useState('');
  const [trainingSearch, setTrainingSearch] = useState('');
  const [personnelIds, setPersonnelIds] = useState<Set<string>>(new Set());
  const [trainingIds, setTrainingIds] = useState<Set<string>>(new Set());
  const [tarih, setTarih] = useState(todayStr());
  const [sonuc, setSonuc] = useState<'Başarılı' | 'Başarısız' | 'Katılmadı' | 'Katıldı'>(
    mode === 'uyari' ? 'Katılmadı' : 'Başarılı',
  );
  const [katilimTarihi, setKatilimTarihi] = useState(todayStr());
  const [dosyaNo, setDosyaNo] = useState('');
  const [not, setNot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddPersonel, setShowAddPersonel] = useState(false);
  const [showAddEgitim, setShowAddEgitim] = useState(false);

  const dosyaNoRequired = isDosyaNoRequired(mode, sonuc);

  const filteredPersonel = useMemo(() => {
    const q = personSearch.trim().toLocaleUpperCase('tr-TR');
    if (!q) return personList;
    return personList.filter((p) =>
      `${p.ad} ${p.soyad} ${p.tcNo ?? ''}`.toLocaleUpperCase('tr-TR').includes(q),
    );
  }, [personList, personSearch]);

  const filteredTrainings = useMemo(() => {
    const q = trainingSearch.trim().toLocaleUpperCase('tr-TR');
    if (!q) return trainingList;
    return trainingList.filter((t) => t.ad.toLocaleUpperCase('tr-TR').includes(q));
  }, [trainingList, trainingSearch]);

  function togglePersonel(id: string) {
    setPersonnelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTraining(id: string) {
    setTrainingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!personnelIds.size || !trainingIds.size || !tarih) {
      toast.error('Lütfen en az bir personel, en az bir eğitim ve tarih seçin.');
      return;
    }
    if (dosyaNoRequired && !dosyaNo.trim()) {
      toast.error('Dosya No zorunlu.');
      return;
    }
    if (sonuc === 'Katıldı' && !katilimTarihi) {
      toast.error('Katılım tarihi zorunlu.');
      return;
    }
    setIsSubmitting(true);
    const result = await submitAction({
      personnelIds: Array.from(personnelIds),
      trainingIds: Array.from(trainingIds),
      tarih,
      sonuc,
      katilimTarihi: sonuc === 'Katıldı' ? katilimTarihi : undefined,
      dosyaNo,
      not,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.created === 1 ? '1 kayıt eklendi.' : `${result.created} kayıt eklendi.`);
    setDosyaNo('');
    setNot('');
    setPersonnelIds(new Set());
    setTrainingIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Personel {personnelIds.size > 0 && `(${personnelIds.size} seçili)`}</Label>
          </div>
          <Input
            value={personSearch}
            onChange={(e) => setPersonSearch(e.target.value)}
            placeholder="Ad, soyad veya TC ile arayın..."
          />
          <div className="max-h-52 space-y-0.5 overflow-auto rounded-md border border-border bg-panel-2 p-1.5">
            {filteredPersonel.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Sonuç bulunamadı</p>
            )}
            {filteredPersonel.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel"
              >
                <input
                  type="checkbox"
                  checked={personnelIds.has(p.id)}
                  onChange={() => togglePersonel(p.id)}
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Eğitim {trainingIds.size > 0 && `(${trainingIds.size} seçili)`}</Label>
          </div>
          <Input
            value={trainingSearch}
            onChange={(e) => setTrainingSearch(e.target.value)}
            placeholder="Eğitim adıyla arayın..."
          />
          <div className="max-h-52 space-y-0.5 overflow-auto rounded-md border border-border bg-panel-2 p-1.5">
            {filteredTrainings.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Sonuç bulunamadı</p>
            )}
            {filteredTrainings.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel"
              >
                <input
                  type="checkbox"
                  checked={trainingIds.has(t.id)}
                  onChange={() => toggleTraining(t.id)}
                  className="accent-primary"
                />
                <span>{t.ad}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{mode === 'uyari' ? 'Gönderildiği Tarih' : 'Tarih'}</Label>
          <Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{mode === 'uyari' ? 'Katılım Durumu' : 'Sonuç'}</Label>
          <Select
            value={sonuc}
            onValueChange={(v) =>
              setSonuc((v as typeof sonuc) ?? (mode === 'uyari' ? 'Katılmadı' : 'Başarılı'))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mode === 'uyari' ? (
                <>
                  <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                  <SelectItem value="Katıldı">Katıldı</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="Başarılı">Başarılı</SelectItem>
                  <SelectItem value="Başarısız">Başarısız</SelectItem>
                  <SelectItem value="Katılmadı">Katılmadı</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {mode === 'uyari' && sonuc === 'Katıldı' && (
          <div className="space-y-1.5">
            <Label>
              Katılım Tarihi<span className="text-danger"> *</span>
            </Label>
            <Input
              type="date"
              value={katilimTarihi}
              onChange={(e) => setKatilimTarihi(e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>
            Dosya No
            {dosyaNoRequired && <span className="text-danger"> *</span>}
          </Label>
          <Input
            value={dosyaNo}
            onChange={(e) => setDosyaNo(e.target.value)}
            placeholder="Eğitim evrakı dosya no"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Not (opsiyonel)</Label>
          <Input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Açıklama vb." />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Seçilen her personel, seçilen her eğitimle eşleştirilip ayrı bir kayıt olarak eklenir — aynı
        anda bir kişiye birden fazla eğitim, ya da bir eğitimi birden fazla kişiye ekleyebilirsiniz.
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Kaydediliyor...' : 'Kayıtları Ekle'}
        </Button>
        {!hideQuickAdd && (
          <>
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
          </>
        )}
      </div>

      {!hideQuickAdd && showAddPersonel && (
        <QuickAddPersonnel
          onCreated={(p) => {
            setPersonList((list) => [...list, p]);
            setPersonnelIds((prev) => new Set(prev).add(p.id));
            setShowAddPersonel(false);
          }}
        />
      )}
      {!hideQuickAdd && showAddEgitim && (
        <QuickAddTraining
          excludeCategories={quickAddExcludeCategories}
          onCreated={(t) => {
            setTrainingList((list) => [...list, t]);
            setTrainingIds((prev) => new Set(prev).add(t.id));
            setShowAddEgitim(false);
          }}
        />
      )}
    </div>
  );
}

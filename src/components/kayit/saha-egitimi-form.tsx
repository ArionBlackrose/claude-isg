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
import { createSahaEgitimiRecords } from '@/actions/saha-egitimi';
import { todayStr } from '@/lib/training-status';
import { toUpperTR } from '@/lib/utils';
import { PersonnelMultiSelect } from './personnel-multi-select';

const DIGER_VALUE = '__DIGER__';

type PersonelOption = { id: string; ad: string; soyad: string; firma: string | null };
type SahaTrainingOption = { id: string; ad: string; digerSecenegiVar: boolean };
type SahaTopicOption = { id: string; trainingId: string; baslik: string };

export function SahaEgitimiForm({
  personnel,
  trainings,
  topics,
}: {
  personnel: PersonelOption[];
  trainings: SahaTrainingOption[];
  topics: SahaTopicOption[];
}) {
  const router = useRouter();
  const [trainingId, setTrainingId] = useState(trainings[0]?.id ?? '');
  const [topicSelection, setTopicSelection] = useState<string>('');
  const [manualTopic, setManualTopic] = useState('');
  const [tarih, setTarih] = useState(todayStr());
  const [personnelIds, setPersonnelIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTraining = trainings.find((t) => t.id === trainingId);
  const topicsForTraining = useMemo(
    () => topics.filter((t) => t.trainingId === trainingId),
    [topics, trainingId],
  );
  const isDiger = topicSelection === DIGER_VALUE;

  function selectTraining(id: string) {
    setTrainingId(id);
    setTopicSelection('');
    setManualTopic('');
  }

  function togglePersonel(id: string) {
    setPersonnelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!trainingId) {
      toast.error('Eğitim türü seçin.');
      return;
    }
    if (!topicSelection) {
      toast.error('Bir başlık seçin.');
      return;
    }
    if (isDiger && !manualTopic.trim()) {
      toast.error('"Diğer" için konu yazın.');
      return;
    }
    if (!tarih) {
      toast.error('Tarih zorunlu.');
      return;
    }
    if (!personnelIds.size) {
      toast.error('En az bir personel seçin.');
      return;
    }
    setIsSubmitting(true);
    const result = await createSahaEgitimiRecords({
      trainingId,
      topicId: isDiger ? undefined : topicSelection,
      manualTopic: isDiger ? manualTopic : undefined,
      tarih,
      personnelIds: Array.from(personnelIds),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.created === 1 ? '1 kayıt eklendi.' : `${result.created} kayıt eklendi.`);
    setPersonnelIds(new Set());
    setTopicSelection('');
    setManualTopic('');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Eğitim Türü</Label>
          <Select value={trainingId} onValueChange={(v) => selectTraining(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => trainings.find((t) => t.id === v)?.ad ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {trainings.map((t) => (
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
      </div>

      <div className="space-y-1.5">
        <Label>Konu / Başlık</Label>
        {!topicsForTraining.length && !selectedTraining?.digerSecenegiVar ? (
          <p className="text-sm text-muted-foreground">
            Bu eğitim türü için henüz başlık tanımlanmadı — admin&apos;in Eğitim Kataloğu&apos;ndan
            başlık eklemesi gerekiyor.
          </p>
        ) : (
          <Select value={topicSelection} onValueChange={(v) => setTopicSelection(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) =>
                  v === DIGER_VALUE
                    ? 'DİĞER'
                    : (topicsForTraining.find((t) => t.id === v)?.baslik ?? 'Seçin...')
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {topicsForTraining.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.baslik}
                </SelectItem>
              ))}
              {selectedTraining?.digerSecenegiVar && (
                <SelectItem value={DIGER_VALUE}>DİĞER</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        {isDiger && (
          <Input
            value={manualTopic}
            onChange={(e) => setManualTopic(toUpperTR(e.target.value))}
            placeholder="KONUYU YAZIN"
            className="mt-2"
          />
        )}
      </div>

      <PersonnelMultiSelect
        personnel={personnel}
        selectedIds={personnelIds}
        onToggle={togglePersonel}
      />

      <p className="text-xs text-muted-foreground">
        Seçilen her personel için ayrı bir kayıt eklenir — eğitim, tek seferde birden fazla kişiye
        verilebilir.
      </p>

      <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? 'Kaydediliyor...' : 'Kayıtları Ekle'}
      </Button>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useConfirm } from '@/hooks/use-confirm';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationBar } from '@/components/ui/pagination-bar';
import { addTrainingTopic, deleteTrainingTopic } from '@/actions/training-topics';
import { toUpperTR } from '@/lib/utils';

export type SahaTraining = {
  id: string;
  ad: string;
  kategori: string;
  egitimSuresi: number;
  digerSecenegiVar: boolean;
  recordCount: number;
};
export type SahaTopic = { id: string; trainingId: string; baslik: string };

/** Admin'in her Saha Eğitimi türü (Bülten, Toolbox vb.) için dış kullanıcı
 * panelinde (Saha Eğitimi Ekle) seçilebilecek konu başlıklarını yönettiği
 * alan — Eğitim Kataloğu sayfasında sadece admin'e gösterilir. Eğitim
 * Kataloğu'ndaki "Yeni Eğitim Türü" formu + aranabilir/sayfalanabilir tablo
 * deseniyle aynı yapıyı kullanır. */
export function SahaBaslikManager({
  trainings,
  topics,
}: {
  trainings: SahaTraining[];
  topics: SahaTopic[];
}) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [addTrainingId, setAddTrainingId] = useState(trainings[0]?.id ?? '');
  const [newBaslik, setNewBaslik] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const trainingById = useMemo(() => new Map(trainings.map((t) => [t.id, t])), [trainings]);
  const filteredTopics = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return topics;
    return topics.filter((t) => {
      const trainingAd = trainingById.get(t.trainingId)?.ad ?? '';
      return (
        t.baslik.toLocaleLowerCase('tr-TR').includes(q) ||
        trainingAd.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [topics, trainingById, search]);
  const { page, setPage, pageSize, totalPages, changePageSize, withPageReset } = usePagination(
    filteredTopics.length,
  );
  const handleSearchChange = withPageReset(setSearch);
  const pagedTopics = filteredTopics.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  if (!trainings.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Önce yukarıdan kategorisi &quot;Saha Eğitimi&quot; olan bir eğitim türü ekleyin.
      </p>
    );
  }

  async function handleAdd() {
    if (!newBaslik.trim() || !addTrainingId) return;
    setIsSubmitting(true);
    const result = await addTrainingTopic({ trainingId: addTrainingId, baslik: newBaslik });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNewBaslik('');
    router.refresh();
  }

  async function handleDelete(topic: SahaTopic) {
    if (
      !(await confirm({
        description: `"${topic.baslik}" başlığını silmek istiyor musunuz?`,
        confirmLabel: 'Sil',
        destructive: true,
      }))
    ) {
      return;
    }
    setPendingId(topic.id);
    const result = await deleteTrainingTopic(topic.id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Eğitim Türü</label>
          <Select value={addTrainingId} onValueChange={(v) => setAddTrainingId(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => trainingById.get(v)?.ad ?? v}</SelectValue>
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
          <label className="text-sm font-medium">Yeni Başlık</label>
          <Input
            value={newBaslik}
            onChange={(e) => setNewBaslik(toUpperTR(e.target.value))}
            placeholder="ör. İŞ GÜVENLİĞİ FARKINDALIĞI"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>
        <Button type="button" disabled={isSubmitting || !newBaslik.trim()} onClick={handleAdd}>
          {isSubmitting ? 'Ekleniyor...' : 'Başlığı Ekle'}
        </Button>
      </div>

      {!topics.length ? (
        <div className="p-8 text-center text-muted-foreground">Henüz başlık eklenmedi.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Eğitim türü veya başlıkla arayın..."
              className="max-w-sm"
            />
            <span className="text-xs text-muted-foreground">{filteredTopics.length} başlık</span>
          </div>
          {filteredTopics.length === 0 ? (
            <div className="rounded-lg border border-border p-10 text-center text-muted-foreground">
              Sonuç bulunamadı.
            </div>
          ) : (
            <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Eğitim Türü</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Süre (Saat)</TableHead>
                  <TableHead>Kayıt Sayısı</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTopics.map((topic) => {
                  const parentTraining = trainingById.get(topic.trainingId);
                  return (
                    <TableRow key={topic.id}>
                      <TableCell className="text-muted-foreground">
                        {parentTraining?.ad ?? 'bilinmeyen eğitim'}
                      </TableCell>
                      <TableCell>{topic.baslik}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {parentTraining?.kategori ?? '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {parentTraining?.egitimSuresi ? `${parentTraining.egitimSuresi} saat` : '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {parentTraining?.recordCount ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-danger text-danger hover:bg-danger/10"
                          disabled={pendingId === topic.id}
                          onClick={() => handleDelete(topic)}
                        >
                          Sil
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {filteredTopics.length > 0 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          )}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

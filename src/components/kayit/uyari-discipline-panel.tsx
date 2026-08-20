'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { applyDisciplineAction } from '@/actions/discipline';
import { DISCIPLINE_ACTIONS } from '@/db/schema';
import { fmtDate, todayStr } from '@/lib/training-status';

type DisciplineActionType = (typeof DISCIPLINE_ACTIONS)[number];

export const ACTION_TAG_CLASS: Record<DisciplineActionType, string> = {
  Uyarı: 'tag-warn',
  Kınama: 'tag-warn',
  'Ağır Kınama': 'tag-bad',
  'İşten Çıkarma': 'tag-bad',
  'Kısıtlı Liste': 'tag-bad',
};

export type FlaggedPersonnelRow = {
  personnelId: string;
  ad: string;
  firma: string | null;
  count: number;
  recordsSummary: string;
  lastAction: {
    action: DisciplineActionType;
    tarih: string;
    not: string | null;
    appliedByName: string;
  } | null;
};

export function DisciplineStatus({
  lastAction,
}: {
  lastAction: FlaggedPersonnelRow['lastAction'];
}) {
  if (!lastAction) {
    return <span className="text-xs text-muted-foreground">Henüz işlem uygulanmadı.</span>;
  }
  return (
    <div className="space-y-1">
      <span className={`tag ${ACTION_TAG_CLASS[lastAction.action]}`}>{lastAction.action}</span>
      {lastAction.not && <p className="text-xs text-muted-foreground">{lastAction.not}</p>}
      <p className="text-xs text-muted-foreground">
        {fmtDate(lastAction.tarih)} · {lastAction.appliedByName}
      </p>
    </div>
  );
}

function DisciplineForm({ personnelId, onDone }: { personnelId: string; onDone: () => void }) {
  const router = useRouter();
  const [action, setAction] = useState<DisciplineActionType>('Uyarı');
  const [tarih, setTarih] = useState(todayStr());
  const [not, setNot] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    if (!tarih) {
      toast.error('Tarih zorunlu.');
      return;
    }
    setIsPending(true);
    const result = await applyDisciplineAction({
      personnelId,
      action,
      tarih,
      not: not || undefined,
    });
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('İşlem kaydedildi.');
    onDone();
    router.refresh();
  }

  return (
    <div className="space-y-2.5">
      <Select
        value={action}
        onValueChange={(v) => setAction((v as DisciplineActionType) ?? action)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISCIPLINE_ACTIONS.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div>
        <div className="mb-1 text-xs text-muted-foreground">Tarih *</div>
        <Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required />
      </div>
      <Textarea
        placeholder="Not (opsiyonel)"
        value={not}
        onChange={(e) => setNot(e.target.value)}
        className="min-h-16 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSave}>
          Kaydet
        </Button>
        <Button size="sm" variant="secondary" onClick={onDone}>
          İptal
        </Button>
      </div>
    </div>
  );
}

export function UyariDisciplinePanel({ rows }: { rows: FlaggedPersonnelRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Son 3 ayda eşiği aşan personel yok.
      </div>
    );
  }

  return (
    <>
      {/* Mobil: kart görünümü */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <div key={r.personnelId} className="rounded-lg border border-border bg-panel p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{r.ad}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.firma || '-'}</div>
              </div>
              <span className="tag tag-bad">{r.count}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{r.recordsSummary}</p>
            <div className="mt-3 border-t border-border pt-3">
              {editingId === r.personnelId ? (
                <DisciplineForm personnelId={r.personnelId} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex flex-col items-start gap-2">
                  <DisciplineStatus lastAction={r.lastAction} />
                  <Button size="sm" variant="outline" onClick={() => setEditingId(r.personnelId)}>
                    {r.lastAction ? 'İşlemi Güncelle' : 'İşlem Uygula'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Masaüstü: tam tablo */}
      <Table containerClassName="hidden max-h-[520px] overflow-auto rounded-lg border border-border md:block">
        <TableHeader>
          <TableRow>
            <TableHead>Personel</TableHead>
            <TableHead>Firma</TableHead>
            <TableHead>Uyarı Sayısı</TableHead>
            <TableHead>Son Uyarı Eğitimleri</TableHead>
            <TableHead className="w-64">Uygulanan İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.personnelId}>
              <TableCell className="font-semibold">{r.ad}</TableCell>
              <TableCell className="text-muted-foreground">{r.firma || '-'}</TableCell>
              <TableCell>
                <span className="tag tag-bad">{r.count}</span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.recordsSummary}</TableCell>
              <TableCell>
                {editingId === r.personnelId ? (
                  <DisciplineForm personnelId={r.personnelId} onDone={() => setEditingId(null)} />
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <DisciplineStatus lastAction={r.lastAction} />
                    <Button size="sm" variant="outline" onClick={() => setEditingId(r.personnelId)}>
                      {r.lastAction ? 'İşlemi Güncelle' : 'İşlem Uygula'}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

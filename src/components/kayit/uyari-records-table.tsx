'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FlagIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { fmtDate, tagClassForSonuc } from '@/lib/training-status';
import { deleteRecord } from '@/actions/records';
import { useConfirm } from '@/hooks/use-confirm';

export type UyariRecordRow = {
  id: string;
  personelAdi: string;
  egitimAdi: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
  dosyaNo: string | null;
  not: string | null;
  createdByName: string;
};

export function UyariRecordsTable({
  records,
  isAdmin,
}: {
  records: UyariRecordRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleDelete(r: UyariRecordRow) {
    if (
      !(await confirm({
        description: `"${r.personelAdi}" personeline ait "${r.egitimAdi}" uyarı eğitimi kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        confirmLabel: 'Sil',
        destructive: true,
      }))
    )
      return;
    setPendingId(r.id);
    const result = await deleteRecord(r.id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Silindi.');
    router.refresh();
  }

  if (!records.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-10 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <FlagIcon className="size-5" />
        </div>
        <div>
          <div className="font-semibold text-foreground">Henüz uyarı eğitimi kaydı yok</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bir personelin uyarı eğitimi aldığını kaydetmek için yukarıdaki formu kullanın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobil: kart görünümü */}
      <div className="space-y-2.5 md:hidden">
        {records.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-panel p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{r.personelAdi}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{r.egitimAdi}</div>
              </div>
              <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase">Tarih</div>
                <div className="font-mono">{fmtDate(r.tarih)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase">Dosya No</div>
                <div>{r.dosyaNo || '-'}</div>
              </div>
              {r.not && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground uppercase">Not</div>
                  <div>{r.not}</div>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground uppercase">Girişi Yapan</div>
                <div>{r.createdByName}</div>
              </div>
            </div>
            {isAdmin && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-danger text-danger hover:bg-danger/10"
                  disabled={pendingId === r.id}
                  onClick={() => handleDelete(r)}
                >
                  Sil
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Masaüstü: tam tablo */}
      <Table containerClassName="hidden max-h-[480px] overflow-auto rounded-lg border border-border md:block">
        <TableHeader>
          <TableRow>
            <TableHead>Tarih</TableHead>
            <TableHead>Personel</TableHead>
            <TableHead>Uyarı Eğitimi</TableHead>
            <TableHead>Sonuç</TableHead>
            <TableHead>Dosya No</TableHead>
            <TableHead>Not</TableHead>
            <TableHead>Girişi Yapan</TableHead>
            {isAdmin && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono">{fmtDate(r.tarih)}</TableCell>
              <TableCell>{r.personelAdi}</TableCell>
              <TableCell>{r.egitimAdi}</TableCell>
              <TableCell>
                <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.dosyaNo || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{r.not || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{r.createdByName}</TableCell>
              {isAdmin && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-danger text-danger hover:bg-danger/10"
                    disabled={pendingId === r.id}
                    onClick={() => handleDelete(r)}
                  >
                    Sil
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {ConfirmDialog}
    </>
  );
}

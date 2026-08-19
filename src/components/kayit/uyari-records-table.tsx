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
      <div className="p-8 text-center text-muted-foreground">Henüz uyarı eğitimi kaydı yok.</div>
    );
  }

  return (
    <>
      <Table containerClassName="max-h-[480px] overflow-auto rounded-lg border border-border">
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

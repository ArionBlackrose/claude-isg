'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deletePersonnel } from '@/actions/personnel';
import { fmtDate } from '@/lib/training-status';
import { PersonelEditDialog } from './personel-edit-dialog';
import { PersonelDetayDialog } from './personel-detay-dialog';

export type PersonelRow = {
  id: string;
  tcNo: string | null;
  ad: string;
  soyad: string;
  gorev: string | null;
  firma: string | null;
  calismaSekli: string | null;
  dogumTarihi: string | null;
  iseGirisTarihi: string | null;
  cikisTarihi: string | null;
  durum: 'Güncel' | 'Çıkış';
  history: {
    firma: string | null;
    gorev: string | null;
    calismaSekli: string | null;
    girisTarihi: string | null;
    cikisTarihi: string | null;
  }[];
  records: {
    id: string;
    trainingId: string;
    egitimAdi: string;
    tarih: string;
    sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
    dosyaNo: string | null;
    not: string | null;
    driveWebViewLink: string | null;
    createdByName: string;
  }[];
};

const DURUM_FILTER_LABELS: Record<string, string> = {
  all: 'Tüm durumlar',
  Güncel: 'Güncel',
  Çıkış: 'Çıkış',
};

export function PersonelTable({
  rows,
  isAdmin,
  canDelete,
}: {
  rows: PersonelRow[];
  isAdmin: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [durumFilter, setDurumFilter] = useState('all');
  const [detayPersonelId, setDetayPersonelId] = useState<string | null>(null);
  const detayPersonel = detayPersonelId
    ? (rows.find((r) => r.id === detayPersonelId) ?? null)
    : null;
  const [editingPersonel, setEditingPersonel] = useState<PersonelRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleDelete(p: PersonelRow) {
    if (
      !window.confirm(
        `"${p.ad} ${p.soyad}" personelini silmek istediğinize emin misiniz?\n\nBu personele ait eğitim kayıtları ve geçmiş dönemleri de birlikte silinecektir.`,
      )
    )
      return;
    setPendingDeleteId(p.id);
    const result = await deletePersonnel(p.id);
    setPendingDeleteId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Silindi.');
    router.refresh();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((p) => {
      if (durumFilter !== 'all' && p.durum !== durumFilter) return false;
      if (q && !`${p.ad} ${p.soyad} ${p.firma ?? ''}`.toLocaleLowerCase('tr-TR').includes(q))
        return false;
      return true;
    });
  }, [rows, search, durumFilter]);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap gap-2.5">
        <Input
          placeholder="Ad, soyad veya firma ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />
        <Select value={durumFilter} onValueChange={(v) => setDurumFilter(v ?? 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue>{(v: string) => DURUM_FILTER_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            <SelectItem value="Güncel">Güncel</SelectItem>
            <SelectItem value="Çıkış">Çıkış</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!filtered.length ? (
        <div className="p-10 text-center text-muted-foreground">Personel bulunamadı.</div>
      ) : (
        <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>TC No</TableHead>
              <TableHead>Görev</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>Çalışma Şekli</TableHead>
              <TableHead>Doğum Tarihi</TableHead>
              <TableHead>İşe Giriş</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <Fragment key={p.id}>
                <TableRow>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left text-primary hover:underline"
                      onClick={() => setDetayPersonelId(p.id)}
                      title="Tüm verileri görüntüle"
                    >
                      {p.ad} {p.soyad}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{p.tcNo || '-'}</TableCell>
                  <TableCell>{p.gorev || '-'}</TableCell>
                  <TableCell>{p.firma || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.calismaSekli || '-'}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {fmtDate(p.dogumTarihi)}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {fmtDate(p.iseGirisTarihi)}
                  </TableCell>
                  <TableCell>
                    <span className={`tag ${p.durum === 'Çıkış' ? 'tag-bad' : 'tag-ok'}`}>
                      {p.durum}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => setEditingPersonel(p)}>
                      Düzenle
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-danger text-danger hover:bg-danger/10"
                        disabled={pendingDeleteId === p.id}
                        onClick={() => handleDelete(p)}
                      >
                        Sil
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
        </Table>
      )}
      {editingPersonel && (
        <PersonelEditDialog
          personnel={editingPersonel}
          open
          onOpenChange={(open) => {
            if (!open) setEditingPersonel(null);
          }}
        />
      )}
      {detayPersonel && (
        <PersonelDetayDialog
          personnel={detayPersonel}
          open
          onOpenChange={(open) => {
            if (!open) setDetayPersonelId(null);
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

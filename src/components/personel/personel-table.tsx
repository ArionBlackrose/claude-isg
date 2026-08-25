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
import { StatusTag } from '@/components/ui/status-tag';
import { fmtDate, toneForDurum } from '@/lib/training-status';
import { PersonelEditDialog } from './personel-edit-dialog';

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
  durum: 'Güncel' | 'Çıkış';
  history: {
    firma: string | null;
    gorev: string | null;
    calismaSekli: string | null;
    girisTarihi: string | null;
    cikisTarihi: string | null;
  }[];
};

const DURUM_FILTER_LABELS: Record<string, string> = {
  all: 'Tüm durumlar',
  Güncel: 'Güncel',
  Çıkış: 'Çıkış',
};

export function PersonelTable({ rows, isAdmin }: { rows: PersonelRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [durumFilter, setDurumFilter] = useState('all');
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
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
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (durumFilter !== 'all' && p.durum !== durumFilter) return false;
      if (q && !`${p.ad} ${p.soyad} ${p.firma ?? ''}`.toLowerCase().includes(q)) return false;
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
        <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
          <Table>
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
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <Fragment key={p.id}>
                  <TableRow>
                    <TableCell>
                      {p.ad} {p.soyad}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {p.tcNo || '-'}
                    </TableCell>
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
                      <StatusTag tone={toneForDurum(p.durum)}>{p.durum}</StatusTag>
                    </TableCell>
                    <TableCell>
                      {p.history.length ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenHistoryId(openHistoryId === p.id ? null : p.id)}
                        >
                          Geçmiş ({p.history.length})
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setEditingPersonel(p)}>
                        Düzenle
                      </Button>
                      {isAdmin && (
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
                  {openHistoryId === p.id && p.history.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="bg-panel-2 p-4">
                        <div className="mb-2 text-xs text-muted-foreground">
                          <b>
                            {p.ad} {p.soyad}
                          </b>{' '}
                          — Önceki Dönemler
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Firma</TableHead>
                              <TableHead>Görev</TableHead>
                              <TableHead>Çalışma Şekli</TableHead>
                              <TableHead>Giriş</TableHead>
                              <TableHead>Çıkış</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {p.history
                              .slice()
                              .reverse()
                              .map((h, i) => (
                                <TableRow key={i}>
                                  <TableCell>{h.firma || '-'}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {h.gorev || '-'}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {h.calismaSekli || '-'}
                                  </TableCell>
                                  <TableCell className="font-mono text-muted-foreground">
                                    {fmtDate(h.girisTarihi)}
                                  </TableCell>
                                  <TableCell className="font-mono text-muted-foreground">
                                    {fmtDate(h.cikisTarihi)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
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
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
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

export type AktiviteLog = {
  id: string;
  userName: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'personel' | 'egitim' | 'kayit' | 'kullanici' | 'proje';
  entityLabel: string;
  summary: string;
  createdAt: string;
};

const ACTION_LABELS: Record<AktiviteLog['action'], string> = {
  create: 'Oluşturma',
  update: 'Güncelleme',
  delete: 'Silme',
};

const ACTION_TAG: Record<AktiviteLog['action'], string> = {
  create: 'tag-ok',
  update: 'tag-warn',
  delete: 'tag-bad',
};

const ENTITY_LABELS: Record<AktiviteLog['entityType'], string> = {
  personel: 'Personel',
  egitim: 'Eğitim',
  kayit: 'Kayıt',
  kullanici: 'Kullanıcı',
  proje: 'Proje',
};

const PAGE_SIZE = 25;

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AktiviteTable({ logs }: { logs: AktiviteLog[] }) {
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(1);

  const userOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.userName));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))];
  }, [logs]);

  const summary = useMemo(() => {
    const byUser = new Map<
      string,
      { create: number; update: number; delete: number; total: number }
    >();
    for (const l of logs) {
      const entry = byUser.get(l.userName) ?? { create: 0, update: 0, delete: 0, total: 0 };
      entry[l.action]++;
      entry.total++;
      byUser.set(l.userName, entry);
    }
    return Array.from(byUser.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return logs.filter((l) => {
      if (userFilter !== 'all' && l.userName !== userFilter) return false;
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (entityFilter !== 'all' && l.entityType !== entityFilter) return false;
      if (q && !`${l.entityLabel} ${l.summary}`.toLocaleLowerCase('tr-TR').includes(q))
        return false;
      return true;
    });
  }, [logs, search, userFilter, actionFilter, entityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function applyFilter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }
  const handleSearch = applyFilter(setSearch);
  const handleUserFilter = applyFilter(setUserFilter);
  const handleActionFilter = applyFilter(setActionFilter);
  const handleEntityFilter = applyFilter(setEntityFilter);

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Kullanıcı Performans Özeti
        </h3>
        {!summary.length ? (
          <p className="text-sm text-muted-foreground">Henüz kayıtlı işlem yok.</p>
        ) : (
          <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Oluşturma</TableHead>
                <TableHead>Güncelleme</TableHead>
                <TableHead>Silme</TableHead>
                <TableHead>Toplam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map(([name, s]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.create}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.update}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.delete}</TableCell>
                  <TableCell className="font-mono font-semibold">{s.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          İşlem Kayıtları
        </h3>
        <div className="mb-3 flex flex-wrap gap-2.5">
          <Input
            placeholder="Ara (varlık veya özet)..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-64"
          />
          <Select value={userFilter} onValueChange={(v) => handleUserFilter(v ?? 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue>{(v: string) => (v === 'all' ? 'Tüm kullanıcılar' : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {userOptions.map((u) => (
                <SelectItem key={u} value={u}>
                  {u === 'all' ? 'Tüm kullanıcılar' : u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={(v) => handleActionFilter(v ?? 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue>
                {(v: string) =>
                  v === 'all' ? 'Tüm işlemler' : ACTION_LABELS[v as AktiviteLog['action']]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm işlemler</SelectItem>
              <SelectItem value="create">Oluşturma</SelectItem>
              <SelectItem value="update">Güncelleme</SelectItem>
              <SelectItem value="delete">Silme</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={(v) => handleEntityFilter(v ?? 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue>
                {(v: string) =>
                  v === 'all' ? 'Tüm varlıklar' : ENTITY_LABELS[v as AktiviteLog['entityType']]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm varlıklar</SelectItem>
              <SelectItem value="personel">Personel</SelectItem>
              <SelectItem value="egitim">Eğitim</SelectItem>
              <SelectItem value="kayit">Kayıt</SelectItem>
              <SelectItem value="kullanici">Kullanıcı</SelectItem>
              <SelectItem value="proje">Proje</SelectItem>
            </SelectContent>
          </Select>
          <span className="self-center text-xs text-muted-foreground">{filtered.length} kayıt</span>
        </div>

        {!filtered.length ? (
          <div className="p-10 text-center text-muted-foreground">Kayıt bulunamadı.</div>
        ) : (
          <>
            <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Varlık Türü</TableHead>
                  <TableHead>Varlık</TableHead>
                  <TableHead>Özet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(l.createdAt)}
                    </TableCell>
                    <TableCell>{l.userName}</TableCell>
                    <TableCell>
                      <span className={`tag ${ACTION_TAG[l.action]}`}>
                        {ACTION_LABELS[l.action]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ENTITY_LABELS[l.entityType]}
                    </TableCell>
                    <TableCell>{l.entityLabel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-2.5 flex items-center justify-between gap-2.5">
              <span className="text-xs text-muted-foreground">
                Sayfa {page} / {totalPages}
              </span>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Önceki
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createUser, updateUserRole } from '@/actions/users';
import { useConfirm } from '@/hooks/use-confirm';

export type ExternalUserRow = { id: string; name: string; email: string; firma: string | null };

export function ExternalUserPanel({ users }: { users: ExternalUserRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [firma, setFirma] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!firma.trim()) {
      toast.error('Firma zorunlu — sorgular sadece bu firmadaki personelle sınırlanır.');
      return;
    }
    setIsSubmitting(true);
    const result = await createUser({ name, email, role: 'dis', firma });
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${name}" için dış kullanıcı erişimi oluşturuldu.`);
    setName('');
    setEmail('');
    setFirma('');
    router.refresh();
  }

  async function handleRevoke(u: ExternalUserRow) {
    if (
      !(await confirm({
        description: `"${u.name}" kullanıcısının Eğitim Pasaportu erişimini kaldırmak istediğinize emin misiniz?`,
        confirmLabel: 'Erişimi Kaldır',
        destructive: true,
      }))
    )
      return;
    setPendingId(u.id);
    const result = await updateUserRole(u.id, 'user');
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Erişim kaldırıldı.');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="dis-name">Ad Soyad</Label>
          <Input
            id="dis-name"
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dis-email">E-posta</Label>
          <Input
            id="dis-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dis-firma">
            Firma<span className="text-danger"> *</span>
          </Label>
          <Input
            id="dis-firma"
            maxLength={100}
            value={firma}
            onChange={(e) => setFirma(e.target.value)}
            placeholder="Sorgular bu firmayla sınırlanır"
            required
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ekleniyor...' : 'Dış Kullanıcı Ekle'}
        </Button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Henüz Eğitim Pasaportu erişimi verilmiş dış kullanıcı yok.
        </p>
      ) : (
        <Table containerClassName="max-h-96 overflow-auto rounded-lg border border-border">
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="text-muted-foreground">{u.firma || '-'}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-danger text-danger hover:bg-danger/10"
                    disabled={pendingId === u.id}
                    onClick={() => handleRevoke(u)}
                  >
                    Erişimi Kaldır
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {ConfirmDialog}
    </div>
  );
}

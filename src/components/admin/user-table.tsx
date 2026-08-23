'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { applyRoleAssignment, deleteUser } from '@/actions/users';
import { PERMISSION_PRESETS } from '@/lib/permissions';
import { useConfirm } from '@/hooks/use-confirm';
import { UserEditDialog } from './user-edit-dialog';
import { UserPermissionsDialog } from './user-permissions-dialog';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  user: 'Kullanıcı',
  dis: 'Dış Kullanıcı (Eğitim Pasaportu)',
  ...Object.fromEntries(PERMISSION_PRESETS.map((p) => [p.key, p.label])),
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'dis';
  permissionKeys: string[];
  permissionsConfigured: boolean;
  firma: string | null;
};

/** Satırdaki Rol seçicisinde gösterilecek değeri hesaplar — "user" bir hesap
 * tam olarak bir preset'in yetki setine sahipse o preset'in adı gösterilir
 * (Editör, İzleyici vb.), aksi halde düz "Kullanıcı" gösterilir. Sadece
 * görünüm içindir; DB'de ayrı bir "preset" alanı yoktur, gerçek kaynak her
 * zaman user_permission tablosudur. */
function roleSelectValue(u: AdminUserRow): string {
  if (u.role !== 'user' || !u.permissionsConfigured) return u.role;
  const granted = new Set(u.permissionKeys);
  const preset = PERMISSION_PRESETS.find(
    (p) =>
      p.permissionKeys.length === granted.size && p.permissionKeys.every((k) => granted.has(k)),
  );
  return preset?.key ?? u.role;
}

export function UserTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  // Tek bir `pendingId` yerine bir set kullanılır — aksi halde farklı
  // satırlardaki eşzamanlı işlemler (ör. A satırında silme sürerken B
  // satırında rol değiştirme) birbirinin "işlem sürüyor" durumunu ezip
  // hâlâ isteği tamamlanmamış bir satırın kontrollerini erken yeniden
  // etkinleştirebiliyordu.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<AdminUserRow | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  // "Dış Kullanıcı"ya geçilirken hesabın kayıtlı firması yoksa (searchPassport'un
  // firma sınırlaması boş firmayla tamamen atlanır) doğrudan uygulamak yerine
  // önce firma sorulur — Yetkiler diyaloğundaki aynı davranışın bu satırdaki
  // hızlı Rol seçicisi karşılığı.
  const [firmaPromptUser, setFirmaPromptUser] = useState<AdminUserRow | null>(null);
  const [firmaPromptValue, setFirmaPromptValue] = useState('');

  function markPending(userId: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }

  /** Dönüş değeri, çağıranın başarıyla mı yoksa hatayla mı sonuçlandığına
   * göre kendi ek adımını (ör. bir diyaloğu kapatmak) karar verebilmesi
   * içindir — hata durumunda diyalog açık kalmalı ki admin firma/rolü
   * düzeltip tekrar deneyebilsin. */
  async function applyRole(
    userId: string,
    assignment: { role: 'admin' | 'user' | 'dis'; permissionKeys: string[] | null; firma?: string },
  ): Promise<boolean> {
    markPending(userId, true);
    try {
      const result = await applyRoleAssignment(userId, assignment);
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      toast.success('Rol güncellendi.');
      router.refresh();
      return true;
    } catch {
      toast.error('Rol güncellenemedi. Lütfen tekrar deneyin.');
      return false;
    } finally {
      markPending(userId, false);
    }
  }

  function handleRoleChange(u: AdminUserRow, value: string | null) {
    if (!value) return;
    const preset = PERMISSION_PRESETS.find((p) => p.key === value);
    if (!preset && value !== 'admin' && value !== 'user' && value !== 'dis') return;
    const role = preset ? 'user' : (value as 'admin' | 'user' | 'dis');
    const permissionKeys = preset ? preset.permissionKeys : null;

    if (role === 'dis' && !u.firma?.trim()) {
      setFirmaPromptValue('');
      setFirmaPromptUser(u);
      return;
    }
    applyRole(u.id, { role, permissionKeys });
  }

  async function handleFirmaPromptSave() {
    if (!firmaPromptUser || !firmaPromptValue.trim()) return;
    const ok = await applyRole(firmaPromptUser.id, {
      role: 'dis',
      permissionKeys: null,
      firma: firmaPromptValue,
    });
    if (ok) setFirmaPromptUser(null);
  }

  async function handleDelete(u: AdminUserRow) {
    const proceed = await confirm({
      description: `"${u.name}" (${u.email}) hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      destructive: true,
    });
    if (!proceed) return;
    markPending(u.id, true);
    try {
      const result = await deleteUser(u.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Kullanıcı silindi.');
      router.refresh();
    } catch {
      toast.error('Kullanıcı silinemedi. Lütfen tekrar deneyin.');
    } finally {
      markPending(u.id, false);
    }
  }

  return (
    <>
      <Table containerClassName="max-h-[520px] overflow-auto rounded-lg border border-border">
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>E-posta</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <TableRow key={u.id}>
                <TableCell>
                  {u.name} {isSelf && <span className="text-muted-foreground">(siz)</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={roleSelectValue(u)}
                    onValueChange={(v) => handleRoleChange(u, v)}
                    disabled={isSelf || pendingIds.has(u.id) || permissionsUser?.id === u.id}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue>{(v: string) => ROLE_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Kullanıcı</SelectItem>
                      {PERMISSION_PRESETS.map((preset) => (
                        <SelectItem key={preset.key} value={preset.key}>
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="admin">Yönetici</SelectItem>
                      <SelectItem value="dis">Dış Kullanıcı (Eğitim Pasaportu)</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEditingUser(u)}>
                    Düzenle
                  </Button>
                  {u.role !== 'admin' && (
                    <Button size="sm" variant="outline" onClick={() => setPermissionsUser(u)}>
                      Yetkiler{u.permissionKeys.length > 0 ? ` (${u.permissionKeys.length})` : ''}
                    </Button>
                  )}
                  {!isSelf && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-danger text-danger hover:bg-danger/10"
                      disabled={pendingIds.has(u.id)}
                      onClick={() => handleDelete(u)}
                    >
                      Sil
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
        />
      )}
      {permissionsUser && (
        <UserPermissionsDialog
          user={permissionsUser}
          open
          onOpenChange={(open) => {
            if (!open) setPermissionsUser(null);
          }}
        />
      )}
      <Dialog
        open={firmaPromptUser !== null}
        onOpenChange={(open) => {
          if (!open) setFirmaPromptUser(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{firmaPromptUser?.name} — Dış Kullanıcı</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="quick-dis-firma">
              Dış kullanıcı için firma zorunludur<span className="text-danger"> *</span>
            </Label>
            <Input
              id="quick-dis-firma"
              value={firmaPromptValue}
              onChange={(e) => setFirmaPromptValue(e.target.value)}
              placeholder="Örn. ABC İNŞAAT"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Bu hesabın sorguları sadece bu firmayla sınırlı olur.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              disabled={
                !firmaPromptValue.trim() ||
                Boolean(firmaPromptUser && pendingIds.has(firmaPromptUser.id))
              }
              onClick={handleFirmaPromptSave}
            >
              Kaydet
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setFirmaPromptUser(null)}>
              İptal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </>
  );
}

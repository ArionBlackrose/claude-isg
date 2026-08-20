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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updateUserRole } from '@/actions/users';
import { UserEditDialog } from './user-edit-dialog';
import { UserPermissionsDialog } from './user-permissions-dialog';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  user: 'Kullanıcı',
  dis: 'Dış Kullanıcı (Eğitim Pasaportu)',
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'dis';
  permissionKeys: string[];
};

export function UserTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<AdminUserRow | null>(null);

  async function handleRoleChange(userId: string, role: string | null) {
    if (!role || (role !== 'admin' && role !== 'user' && role !== 'dis')) return;
    setPendingId(userId);
    const result = await updateUserRole(userId, role);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Rol güncellendi.');
    router.refresh();
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
                    value={u.role}
                    onValueChange={(v) => handleRoleChange(u.id, v)}
                    disabled={isSelf || pendingId === u.id}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>{(v: string) => ROLE_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Kullanıcı</SelectItem>
                      <SelectItem value="admin">Yönetici</SelectItem>
                      <SelectItem value="dis">Dış Kullanıcı (Eğitim Pasaportu)</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEditingUser(u)}>
                    Düzenle
                  </Button>
                  {u.role === 'dis' && (
                    <Button size="sm" variant="outline" onClick={() => setPermissionsUser(u)}>
                      Yetkiler{u.permissionKeys.length > 0 ? ` (${u.permissionKeys.length})` : ''}
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
    </>
  );
}

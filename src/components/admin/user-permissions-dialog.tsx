'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateUserPermissions } from '@/actions/users';
import { isValidPermissionKey, PERMISSION_CATALOG, type PermissionKey } from '@/lib/permissions';
import type { AdminUserRow } from './user-table';

/** Kataloğu grup başlığına göre böler — bugün tek grup ("Eğitim
 * Pasaportu") var, ama yeni bir grup eklendiğinde otomatik ayrı bir
 * başlık altında gösterilir, kod değişikliği gerekmez. */
function groupCatalog() {
  const groups = new Map<string, (typeof PERMISSION_CATALOG)[number][]>();
  for (const permission of PERMISSION_CATALOG) {
    const list = groups.get(permission.group) ?? [];
    list.push(permission);
    groups.set(permission.group, list);
  }
  return Array.from(groups.entries());
}

export function UserPermissionsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<PermissionKey>>(
    () => new Set(user.permissionKeys.filter(isValidPermissionKey)),
  );
  const [isSaving, setIsSaving] = useState(false);

  function toggle(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await updateUserPermissions(user.id, Array.from(selected));
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Yetkiler güncellendi.');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user.name} — Yetkiler</DialogTitle>
        </DialogHeader>
        <p className="mb-1 text-xs text-muted-foreground">
          Bu kullanıcının sahip olacağı yetkileri işaretleyin. İşaretlenmeyen bir yetki, o kullanıcı
          için kapalı sayılır.
        </p>
        <div className="space-y-4">
          {groupCatalog().map(([group, permissions]) => (
            <div key={group}>
              <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group}
              </h4>
              <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
                {permissions.map((permission) => (
                  <label
                    key={permission.key}
                    className="flex cursor-pointer items-start gap-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-primary"
                      checked={selected.has(permission.key)}
                      onChange={() => toggle(permission.key)}
                    />
                    <span>
                      <span className="font-semibold">{permission.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {permission.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" disabled={isSaving} onClick={handleSave}>
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

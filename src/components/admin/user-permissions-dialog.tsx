'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { applyRoleAssignment, updateUserPermissions } from '@/actions/users';
import { getPermissionsForRole, PERMISSION_PRESETS, type PermissionKey } from '@/lib/permissions';
import type { AdminUserRow } from './user-table';

/** Kataloğu grup başlığına göre böler — bir grup eklendiğinde/kaldırıldığında
 * otomatik yansır, kod değişikliği gerekmez. */
function groupCatalog(permissions: ReturnType<typeof getPermissionsForRole>) {
  const groups = new Map<string, typeof permissions>();
  for (const permission of permissions) {
    const list = groups.get(permission.group) ?? [];
    list.push(permission);
    groups.set(permission.group, list);
  }
  return Array.from(groups.entries());
}

/** "Roller" satırındaki tek buton listesi — hesabın gerçek rolünü değiştiren
 * üç temel rol (Yönetici/Kullanıcı/Dış Kullanıcı) ile "user" rolü için hazır
 * yetki şablonlarını (Editör, Kontrolör vb.) tek bir akışta birleştirir.
 * Sıra, admin panelinde görünmesi istenen sırayı yansıtır. */
type RoleButtonItem =
  | { kind: 'role'; value: 'admin' | 'user' | 'dis'; label: string }
  | { kind: 'preset'; preset: (typeof PERMISSION_PRESETS)[number] };

function buildRoleButtons(): RoleButtonItem[] {
  const byKey = new Map(PERMISSION_PRESETS.map((p) => [p.key, p]));
  const preset = (key: string): RoleButtonItem => ({ kind: 'preset', preset: byKey.get(key)! });
  return [
    preset('editor'),
    { kind: 'role', value: 'admin', label: 'Yönetici' },
    { kind: 'role', value: 'user', label: 'Kullanıcı' },
    { kind: 'role', value: 'dis', label: 'Dış Kullanıcı (Eğitim Pasaportu)' },
    preset('veri_giris_sorumlusu'),
    preset('uyari_egitimi_sorumlusu'),
    preset('kontrolor'),
    preset('personel_giris_sorumlusu'),
    preset('egitim_giris_sorumlusu'),
  ];
}
const ROLE_BUTTONS = buildRoleButtons();

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
  // "Yetkiler" butonu sadece "user"/"dis" hesapları için gösterilir (bkz.
  // user-table.tsx) — admin granüler yetkiye tabi değildir, bu dialog
  // admin için hiç açılmaz.
  const catalog = user.role === 'admin' ? [] : getPermissionsForRole(user.role);
  const catalogKeys = new Set<string>(catalog.map((p) => p.key));
  const [selected, setSelected] = useState<Set<PermissionKey>>(
    () => new Set(user.permissionKeys.filter((k): k is PermissionKey => catalogKeys.has(k))),
  );
  const [isSaving, setIsSaving] = useState(false);

  // "user" rolündeki hesabın granüler yetkileri tam olarak bir şablonun
  // setine uyuyorsa o şablon butonu da aktif gösterilir — sadece görünüm
  // içindir, gerçek kaynak her zaman user_permission tablosudur.
  const activePresetKey =
    user.role === 'user'
      ? (PERMISSION_PRESETS.find(
          (p) =>
            p.permissionKeys.length === selected.size &&
            p.permissionKeys.every((k) => selected.has(k)),
        )?.key ?? null)
      : null;

  function toggle(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** "Roller" satırındaki herhangi bir butona tıklandığında hemen etkili
   * olur — Kaydet'e basmaya gerek yoktur, diyalog kapanır. Rol değişimi ve
   * yetki setinin uygulanması applyRoleAssignment içinde TEK bir
   * transaction'da yapılır (bkz. o action'ın belgesi) — yarım kalan bir
   * "role değişti ama izinler yazılamadı" durumu oluşmaz. */
  async function applyRoleButton(item: RoleButtonItem) {
    setIsSaving(true);
    const result = await applyRoleAssignment(
      user.id,
      item.kind === 'role' ? { role: item.value } : { presetKey: item.preset.key },
    );
    setIsSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Rol güncellendi.');
    onOpenChange(false);
    router.refresh();
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
        <div className="mb-2">
          <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Roller
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_BUTTONS.map((item) => {
              const isRole = item.kind === 'role';
              const key = isRole ? item.value : item.preset.key;
              const label = isRole ? item.label : item.preset.label;
              const title = isRole ? undefined : item.preset.description;
              const isActive = isRole
                ? user.role === item.value
                : activePresetKey === item.preset.key;
              return (
                <button
                  key={key}
                  type="button"
                  title={title}
                  disabled={isSaving}
                  onClick={() => applyRoleButton(item)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-panel-2 text-muted-foreground hover:border-primary hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="max-h-[60vh] space-y-4 overflow-auto pr-1">
          {groupCatalog(catalog).map(([group, permissions]) => (
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
                      {!permission.enforced && (
                        <span className="ml-1.5 text-xs text-warning">(henüz uygulanmıyor)</span>
                      )}
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

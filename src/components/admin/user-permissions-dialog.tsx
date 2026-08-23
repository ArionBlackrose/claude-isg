'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { applyRoleAssignment } from '@/actions/users';
import {
  getPermissionKeysForRole,
  getPermissionsForRole,
  PERMISSION_PRESETS,
  type PermissionKey,
} from '@/lib/permissions';
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
  const initialCatalogKeys = new Set<string>(
    (user.role === 'admin' ? [] : getPermissionsForRole(user.role)).map((p) => p.key),
  );

  // Diyalogdaki HER ŞEY (rol seçimi, şablon/checkbox seçimi) sadece bu
  // yerel taslağı günceller — "Kaydet"e basılana kadar hiçbir server
  // action çağrılmaz, veritabanında hiçbir şey değişmez. Bu, admin'in bir
  // rol/şablon butonuna yanlışlıkla tıklamasının hesabı anında
  // değiştirmemesi için kasıtlıdır.
  const [pendingRole, setPendingRole] = useState<'admin' | 'user' | 'dis'>(user.role);
  const [selected, setSelected] = useState<Set<PermissionKey>>(
    () => new Set(user.permissionKeys.filter((k): k is PermissionKey => initialCatalogKeys.has(k))),
  );
  // true iken "Kaydet" yetkileri varsayılana sıfırlar (permissionsConfigured
  // =false → tam erişim) — checkbox'ların görsel durumundan bağımsız bir
  // niyet bayrağıdır, çünkü "hepsi işaretli" (configured=true) ile
  // "yapılandırılmamış" (configured=false) DB'de farklı durumlar olsa da
  // davranışları aynıdır (tam erişim); admin'in hangisini kaydetmek
  // istediğini ayrıca takip etmemiz gerekir.
  const [resetToDefault, setResetToDefault] = useState(!user.permissionsConfigured);
  const [isSaving, setIsSaving] = useState(false);
  // Hesabın zaten kayıtlı bir firması yoksa ve "dis" rolüne geçiliyorsa,
  // searchPassport'un firma sınırlaması boş firmayla tamamen atlanacağından
  // (bkz. applyRoleAssignment'taki kontrol) Kaydet'e basmadan önce firma
  // burada, aynı diyalogda istenir — admin'in ayrı bir yere gidip firma
  // ayarlamasına gerek kalmaz.
  const [firmaInput, setFirmaInput] = useState('');

  const catalog = pendingRole === 'admin' ? [] : getPermissionsForRole(pendingRole);
  const firmaRequired = pendingRole === 'dis' && !user.firma?.trim();

  // "user" rolündeki taslağın granüler yetkileri tam olarak bir şablonun
  // setine uyuyorsa o şablon butonu da aktif gösterilir — sadece görünüm
  // içindir.
  const activePresetKey =
    pendingRole === 'user' && !resetToDefault
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
    setResetToDefault(false);
  }

  /** "Roller" satırındaki bir butona tıklamak SADECE yerel taslağı
   * günceller, veritabanına hiçbir şey yazmaz. Zaten seçili olan role
   * tekrar tıklamak hiçbir şey yapmaz — aksi halde admin'in henüz
   * kaydetmediği checkbox değişikliklerini fark ettirmeden silerdi. Tıklanan
   * rol hesabın DB'deki GÜNCEL rolüyle aynıysa mevcut kayıtlı durumu geri
   * yükler (geri dönüşü kolaylaştırmak için); farklıysa hem "user" hem
   * "dis" için hepsi işaretli + varsayılana sıfırlama niyetiyle başlar
   * (admin ayrıca kaydetmeden panele erişemeyen ya da pasaportta hiçbir
   * sütun göremeyen bir hesap oluşturmasın diye), sadece "admin" için boş
   * bir taslakla başlar (admin zaten granüler yetkiye tabi değildir). */
  function selectBaseRole(role: 'admin' | 'user' | 'dis') {
    if (role === pendingRole) return;
    setPendingRole(role);
    if (role === user.role) {
      const keySet = new Set<string>(getPermissionKeysForRole(role === 'admin' ? 'user' : role));
      setSelected(new Set(user.permissionKeys.filter((k): k is PermissionKey => keySet.has(k))));
      setResetToDefault(!user.permissionsConfigured);
    } else if (role === 'admin') {
      setSelected(new Set());
      setResetToDefault(false);
    } else {
      setSelected(new Set(getPermissionKeysForRole(role)));
      setResetToDefault(true);
    }
  }

  function selectPreset(preset: (typeof PERMISSION_PRESETS)[number]) {
    setPendingRole('user');
    setSelected(new Set(preset.permissionKeys));
    setResetToDefault(false);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await applyRoleAssignment(user.id, {
        role: pendingRole,
        permissionKeys: pendingRole === 'admin' || resetToDefault ? null : Array.from(selected),
        firma: firmaRequired ? firmaInput : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Kaydedildi.');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user.name} — Yetkiler</DialogTitle>
        </DialogHeader>
        <p className="mb-1 text-xs text-muted-foreground">
          Bu kullanıcının sahip olacağı rolü ve yetkileri seçin, ardından{' '}
          <span className="font-semibold text-foreground">Kaydet</span>&apos;e basın —
          &quot;Kaydet&quot;e basmadan hiçbir değişiklik uygulanmaz.
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
                ? pendingRole === item.value
                : activePresetKey === item.preset.key;
              return (
                <button
                  key={key}
                  type="button"
                  title={title}
                  disabled={isSaving}
                  onClick={() => (isRole ? selectBaseRole(item.value) : selectPreset(item.preset))}
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
        {firmaRequired && (
          <div className="mb-2 space-y-1.5 rounded-lg border border-warning/40 bg-panel-2 p-3">
            <Label htmlFor="dis-firma">
              Dış kullanıcı için firma zorunludur<span className="text-danger"> *</span>
            </Label>
            <Input
              id="dis-firma"
              value={firmaInput}
              onChange={(e) => setFirmaInput(e.target.value)}
              placeholder="Örn. ABC İNŞAAT"
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              Bu hesabın sorguları sadece bu firmayla sınırlı olur.
            </p>
          </div>
        )}
        {(pendingRole === 'user' || pendingRole === 'dis') && resetToDefault && (
          <p className="mb-2 rounded-lg border border-border bg-panel-2 p-2.5 text-xs text-muted-foreground">
            {pendingRole === 'user'
              ? 'Bu hesap varsayılan (yapılandırılmamış) durumda — tüm panellere tam erişimi olur. Belirli yetkilerle sınırlamak için aşağıdan işaretleyin veya bir şablon seçin.'
              : "Bu hesap varsayılan (yapılandırılmamış) durumda — Eğitim Pasaportu'ndaki tüm bilgi alanlarını görebilir. Belirli alanlarla sınırlamak için aşağıdan işaretleyin."}
          </p>
        )}
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
          {pendingRole === 'admin' && (
            <p className="text-sm text-muted-foreground">
              Yönetici hesapları granüler yetkiye tabi değildir — her zaman tam erişimlidir.
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            disabled={isSaving || (firmaRequired && !firmaInput.trim())}
            onClick={handleSave}
          >
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

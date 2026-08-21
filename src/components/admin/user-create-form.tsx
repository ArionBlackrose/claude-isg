'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createUser, updateUserPermissions } from '@/actions/users';
import { PERMISSION_PRESETS } from '@/lib/permissions';
import { createUserSchema, type CreateUserInput, type CreateUserOutput } from '@/schemas/user';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  user: 'Kullanıcı',
  dis: 'Dış Kullanıcı (Eğitim Pasaportu)',
  ...Object.fromEntries(PERMISSION_PRESETS.map((p) => [p.key, p.label])),
};
/** Rol seçicideki değer — gerçek DB rolü ("admin"/"user"/"dis") ya da "user"
 * rolüyle birlikte belirli bir yetki şablonunu uygulayan bir preset anahtarı
 * olabilir (bkz. PERMISSION_PRESETS). Form gönderiminde ikisi ayrıştırılır. */
type RoleFieldValue = 'admin' | 'user' | 'dis' | (typeof PERMISSION_PRESETS)[number]['key'];
const DEFAULTS: CreateUserInput = { name: '', email: '', role: 'user' };

export function UserCreateForm() {
  const router = useRouter();
  const [roleField, setRoleField] = useState<RoleFieldValue>('user');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput, unknown, CreateUserOutput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: DEFAULTS,
  });

  function handleRoleFieldChange(v: string | null) {
    if (!v) return;
    const preset = PERMISSION_PRESETS.find((p) => p.key === v);
    setRoleField(v as RoleFieldValue);
    setValue('role', preset ? 'user' : (v as 'admin' | 'user' | 'dis'));
  }

  async function onSubmit(values: CreateUserOutput) {
    const result = await createUser(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const preset = PERMISSION_PRESETS.find((p) => p.key === roleField);
    if (preset) {
      const permResult = await updateUserPermissions(result.id, preset.permissionKeys);
      if (!permResult.ok) {
        toast.error(`Kullanıcı eklendi ama yetkiler uygulanamadı: ${permResult.error}`);
        reset(DEFAULTS);
        setRoleField('user');
        router.refresh();
        return;
      }
    }
    toast.success(
      `"${values.name}" kullanıcısı eklendi. Giriş kodu, ilk girişte e-postasına gönderilecek.`,
    );
    reset(DEFAULTS);
    setRoleField('user');
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Ad Soyad</Label>
        <Input id="name" maxLength={50} {...register('name')} />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Rol</Label>
        <Select value={roleField} onValueChange={handleRoleFieldChange}>
          <SelectTrigger id="role" className="w-full">
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
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
      </Button>
    </form>
  );
}

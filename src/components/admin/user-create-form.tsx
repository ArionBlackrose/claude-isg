'use client';

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
import { createUser } from '@/actions/users';
import { createUserSchema, type CreateUserInput } from '@/schemas/user';

const ROLE_LABELS: Record<string, string> = { admin: 'Yönetici', user: 'Kullanıcı' };

export function UserCreateForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'user' },
  });

  async function onSubmit(values: CreateUserInput) {
    const result = await createUser(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${values.name}" kullanıcısı eklendi.`);
    reset({ name: '', email: '', password: '', role: 'user' });
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Ad Soyad</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Rol</Label>
        <Select
          value={watch('role')}
          onValueChange={(v) => setValue('role', (v as 'admin' | 'user') ?? 'user')}
        >
          <SelectTrigger id="role" className="w-full">
            <SelectValue>{(v: string) => ROLE_LABELS[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Kullanıcı</SelectItem>
            <SelectItem value="admin">Yönetici</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ekleniyor...' : 'Kullanıcı Ekle'}
      </Button>
    </form>
  );
}

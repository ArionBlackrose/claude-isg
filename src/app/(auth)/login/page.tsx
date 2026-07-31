'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { loginSchema, type LoginInput } from '@/schemas/auth';

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(error.message ?? 'Giriş başarısız. Bilgilerinizi kontrol edin.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-panel p-8">
      <div className="mb-6">
        <div
          className="mb-3 inline-block bg-primary px-4 py-2 font-heading text-sm font-extrabold tracking-wide text-primary-foreground"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)',
          }}
        >
          REC · TSK
        </div>
        <h1 className="font-heading text-2xl font-extrabold tracking-wide uppercase">
          Eğitim Takip Sistemi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Devam etmek için giriş yapın</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </Button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import {
  requestCodeSchema,
  verifyCodeSchema,
  type RequestCodeInput,
  type VerifyCodeInput,
} from '@/schemas/auth';

const ERROR_MESSAGES_TR: Record<string, string> = {
  'Invalid email or password': 'E-posta veya kod hatalı.',
  'Invalid email': 'Geçersiz e-posta adresi.',
  'User not found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
  'invalid otp': 'Kod hatalı veya süresi dolmuş.',
  'otp expired': 'Kodun süresi doldu, yeni kod isteyin.',
  'too many attempts': 'Çok fazla hatalı deneme yapıldı, yeni kod isteyin.',
};

function translateAuthError(message: string | undefined): string {
  if (!message) return 'İşlem başarısız. Tekrar deneyin.';
  return ERROR_MESSAGES_TR[message] ?? message;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const emailForm = useForm<RequestCodeInput>({ resolver: zodResolver(requestCodeSchema) });
  const otpForm = useForm<VerifyCodeInput>({ resolver: zodResolver(verifyCodeSchema) });

  async function onRequestCode(values: RequestCodeInput) {
    setServerError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: values.email,
      type: 'sign-in',
    });
    if (error) {
      setServerError(translateAuthError(error.message));
      return;
    }
    setEmail(values.email);
    setStep('otp');
  }

  async function onVerifyCode(values: VerifyCodeInput) {
    setServerError(null);
    const { error } = await authClient.signIn.emailOtp({
      email,
      otp: values.otp,
    });
    if (error) {
      setServerError(translateAuthError(error.message));
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleResend() {
    setIsResending(true);
    setServerError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' });
    setIsResending(false);
    if (error) {
      setServerError(translateAuthError(error.message));
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-panel p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold tracking-wide uppercase">
          İSG-Ç Eğitim Takip Sistemi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 'email'
            ? 'Devam etmek için e-posta adresinizi girin'
            : `${email} adresine gönderilen 6 haneli kodu girin`}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={emailForm.handleSubmit(onRequestCode)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-danger">{emailForm.formState.errors.email.message}</p>
            )}
          </div>
          {serverError && <p className="text-sm text-danger">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting ? 'Kod gönderiliyor...' : 'Kod Gönder'}
          </Button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(onVerifyCode)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp">Giriş Kodu</Label>
            <Input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              className="text-center font-mono text-lg tracking-[0.4em]"
              {...otpForm.register('otp')}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-xs text-danger">{otpForm.formState.errors.otp.message}</p>
            )}
          </div>
          {serverError && <p className="text-sm text-danger">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
            {otpForm.formState.isSubmitting ? 'Doğrulanıyor...' : 'Giriş Yap'}
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep('email');
                setServerError(null);
                otpForm.reset();
              }}
            >
              ← E-postayı değiştir
            </button>
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-50"
              disabled={isResending}
              onClick={handleResend}
            >
              {isResending ? 'Gönderiliyor...' : 'Kodu tekrar gönder'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

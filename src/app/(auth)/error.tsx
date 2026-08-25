'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-panel p-8 text-center">
      <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase text-danger">
        Bir şeyler ters gitti
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Giriş sayfası yüklenirken beklenmeyen bir hata oluştu.
      </p>
      <Button type="button" className="w-full" onClick={reset}>
        Tekrar dene
      </Button>
    </div>
  );
}

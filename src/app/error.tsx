'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/** Kök layout'un altındaki, ama (app)/(auth) grup sınırlarının dışında kalan
 * hatalar için son çare — örn. bir grup layout'unun kendisi (requireSession
 * vb.) beklenmedik şekilde patlarsa grup içindeki error.tsx bunu yakalamaz,
 * hata buraya kadar yükselir. */
export default function RootError({
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-panel p-8 text-center">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase text-danger">
          Bir şeyler ters gitti
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Uygulama yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir veya sayfayı
          yenileyebilirsiniz.
        </p>
        <Button type="button" onClick={reset}>
          Tekrar dene
        </Button>
      </div>
    </div>
  );
}

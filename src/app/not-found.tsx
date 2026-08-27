import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-panel p-8 text-center">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Sayfa bulunamadı
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Aradığınız sayfa mevcut değil ya da taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}

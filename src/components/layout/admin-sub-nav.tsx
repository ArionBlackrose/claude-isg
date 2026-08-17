'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const SUB_TABS = [
  { href: '/admin/kullanicilar', label: 'Kullanıcılar' },
  { href: '/admin/aktivite', label: 'Aktivite' },
  { href: '/admin/proje', label: 'Proje Bilgileri' },
] as const;

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-border">
      {SUB_TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-[3px] border-transparent px-3.5 py-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground',
              active && 'border-primary text-primary',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

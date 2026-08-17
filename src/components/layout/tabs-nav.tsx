'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Eğitim Ekle' },
  { href: '/kayitlar', label: 'Kayıtlar' },
  { href: '/rapor', label: 'Rapor' },
  { href: '/personel', label: 'Personel' },
  { href: '/katalog', label: 'Eğitim Kataloğu' },
] as const;

export function TabsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin ? [...TABS, { href: '/admin', label: 'Admin Paneli' }] : TABS;

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active =
          tab.href === '/'
            ? pathname === '/'
            : tab.href === '/admin'
              ? pathname.startsWith('/admin')
              : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-[3px] border-transparent px-4 py-2.5 font-heading text-[17px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground',
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

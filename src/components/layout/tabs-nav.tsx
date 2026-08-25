'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: 'Kayıt Ekle' },
  { href: '/kayitlar', label: 'Kayıtlar' },
  { href: '/rapor', label: 'Rapor' },
  { href: '/personel', label: 'Personel' },
  { href: '/katalog', label: 'Eğitim Kataloğu' },
] as const;

export function TabsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin ? [...TABS, { href: '/admin/kullanicilar', label: 'Kullanıcılar' }] : TABS;

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'relative px-4 py-2.5 font-heading text-[17px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground',
              active && 'text-primary',
            )}
          >
            {tab.label}
            {active && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-x-0 -bottom-px h-[3px] bg-primary"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

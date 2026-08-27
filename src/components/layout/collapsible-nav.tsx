'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuIcon, XIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export type NavTab = { href: string; label: string };

/** Masaüstünde yatay sekme çubuğu, mobilde hamburger + açılır menü olarak
 * render edilen paylaşılan gezinme bileşeni — TabsNav ve AdminSubNav bu
 * bileşeni kullanır, böylece mobil davranış her ikisinde de tutarlı kalır. */
export function CollapsibleNav({
  tabs,
  ariaLabel,
  isActive,
  size = 'lg',
}: {
  tabs: readonly NavTab[];
  ariaLabel: string;
  isActive: (pathname: string, href: string) => boolean;
  size?: 'lg' | 'sm';
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Sayfa bir Link tıklaması olmadan değişirse (ör. tarayıcı geri/ileri
  // tuşu) açık kalan mobil çekmeceyi render sırasında kapatır.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const desktopText = size === 'lg' ? 'font-heading text-[17px]' : 'text-sm';
  const mobileText = size === 'lg' ? 'font-heading text-[15px]' : 'text-sm';
  const slug = ariaLabel.replace(/\s+/g, '-').toLowerCase();
  const drawerId = `${slug}-drawer`;
  // Bu sekme çubuğunun kayan alt-çizgi göstergesine özel layoutId — TabsNav
  // ve AdminSubNav aynı anda (admin sayfalarında) birlikte monte olabildiği
  // için ortak bir sabit kullanılırsa Motion ikisi arasında göstergeyi
  // "taşımaya" çalışır; ariaLabel'dan türetilen slug her örneği ayırır.
  const underlineLayoutId = `${slug}-underline`;

  return (
    <nav
      className={cn('border-b border-border', size === 'lg' ? 'mb-6' : 'mb-4')}
      aria-label={ariaLabel}
    >
      {/* Masaüstü: yatay sekme çubuğu */}
      <div className="hidden flex-wrap gap-1 md:flex">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                `relative border-b-[3px] border-transparent px-4 py-2.5 ${desktopText} font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground`,
                active && 'text-primary',
              )}
            >
              {tab.label}
              {active && (
                <motion.span
                  layoutId={underlineLayoutId}
                  className="absolute inset-x-0 -bottom-[3px] h-[3px] bg-primary"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobil: hamburger + açılır menü */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={drawerId}
          className={`flex w-full items-center justify-between py-2.5 ${mobileText} font-semibold tracking-wide text-primary uppercase`}
        >
          <span>{tabs.find((t) => isActive(pathname, t.href))?.label ?? 'Menü'}</span>
          {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
        {open && (
          <div id={drawerId} className="flex flex-col border-t border-border pb-2">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                className={cn(
                  `border-l-[3px] border-transparent px-3 py-3 ${mobileText} font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground`,
                  isActive(pathname, tab.href) && 'border-primary text-primary',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

'use client';

import { CollapsibleNav } from './collapsible-nav';

const TABS = [
  { href: '/', label: 'Eğitim Ekle' },
  { href: '/kayitlar', label: 'Kayıtlar' },
  { href: '/rapor', label: 'Rapor' },
  { href: '/personel', label: 'Personel' },
  { href: '/katalog', label: 'Eğitim Kataloğu' },
  { href: '/uyari', label: 'Uyarı Eğitimleri' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/admin') return pathname.startsWith('/admin');
  return pathname.startsWith(href);
}

export function TabsNav({ isAdmin }: { isAdmin: boolean }) {
  const tabs = isAdmin ? [...TABS, { href: '/admin', label: 'Admin Paneli' }] : TABS;

  return <CollapsibleNav tabs={tabs} ariaLabel="Ana menü" isActive={isActive} size="lg" />;
}

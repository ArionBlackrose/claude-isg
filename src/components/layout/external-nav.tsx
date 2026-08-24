'use client';

import { CollapsibleNav } from './collapsible-nav';

const TABS = [
  { href: '/pasaport', label: 'Eğitim Pasaportu' },
  { href: '/saha-egitimi', label: 'Saha Eğitimi Ekle' },
] as const;

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export function ExternalNav() {
  return (
    <CollapsibleNav tabs={TABS} ariaLabel="Dış kullanıcı menüsü" isActive={isActive} size="lg" />
  );
}

'use client';

import { CollapsibleNav } from './collapsible-nav';

const TABS = [
  { href: '/pasaport', label: 'Eğitim Pasaportu' },
  { href: '/saha-egitimi', label: 'Saha Eğitimi Ekle' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname.startsWith('/admin');
  return pathname.startsWith(href);
}

export function ExternalNav({ isAdmin = false }: { isAdmin?: boolean }) {
  // Admin bu panelleri sadece kontrol amacıyla ziyaret eder — "dis" hesapların
  // aksine, geri dönüp asıl panele erişebilmesi gerekir.
  const tabs = isAdmin ? [...TABS, { href: '/admin', label: '← Admin Paneline Dön' }] : TABS;
  return (
    <CollapsibleNav tabs={tabs} ariaLabel="Dış kullanıcı menüsü" isActive={isActive} size="lg" />
  );
}

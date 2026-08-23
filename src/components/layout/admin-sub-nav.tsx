'use client';

import { CollapsibleNav } from './collapsible-nav';

const SUB_TABS = [
  { href: '/admin/kullanicilar', label: 'Kullanıcılar' },
  { href: '/admin/aktivite', label: 'Aktivite' },
  { href: '/admin/proje', label: 'Proje Bilgileri' },
  { href: '/admin/pasaport', label: 'Eğitim Pasaportu' },
  { href: '/admin/sifirlama', label: 'Sistem Sıfırlama' },
] as const;

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export function AdminSubNav() {
  return (
    <CollapsibleNav tabs={SUB_TABS} ariaLabel="Admin alt menü" isActive={isActive} size="sm" />
  );
}

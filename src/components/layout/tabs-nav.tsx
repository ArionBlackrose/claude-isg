'use client';

import { CollapsibleNav } from './collapsible-nav';

const TABS = [
  { href: '/', label: 'Eğitim Ekle', permission: 'panel.egitim_ekle' },
  { href: '/kayitlar', label: 'Kayıtlar', permission: 'panel.kayitlar' },
  { href: '/rapor', label: 'Rapor', permission: 'panel.rapor' },
  { href: '/personel', label: 'Personel', permission: 'panel.personel' },
  { href: '/katalog', label: 'Eğitim Kataloğu', permission: 'panel.katalog' },
  { href: '/uyari', label: 'Uyarı Eğitimleri', permission: 'panel.uyari' },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/admin') return pathname.startsWith('/admin');
  return pathname.startsWith(href);
}

export function TabsNav({
  isAdmin,
  grantedPanels,
}: {
  isAdmin: boolean;
  /** null: hesabın yetkileri hiç yapılandırılmamış — tüm sekmeler
   * gösterilir (geriye dönük uyumluluk). Bir dizi verildiyse sadece o
   * dizideki panel anahtarlarına karşılık gelen sekmeler gösterilir. */
  grantedPanels: string[] | null;
}) {
  const visibleTabs =
    isAdmin || grantedPanels === null
      ? TABS
      : TABS.filter((t) => grantedPanels.includes(t.permission));
  const tabs = isAdmin ? [...visibleTabs, { href: '/admin', label: 'Admin Paneli' }] : visibleTabs;

  return <CollapsibleNav tabs={tabs} ariaLabel="Ana menü" isActive={isActive} size="lg" />;
}

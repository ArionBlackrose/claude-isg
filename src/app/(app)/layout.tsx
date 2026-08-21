import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { getGrantedPermissionKeys } from '@/lib/user-permissions';
import { Header } from '@/components/layout/header';
import { TabsNav } from '@/components/layout/tabs-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  // Dış kullanıcılar (rol: "dis") sadece Eğitim Pasaportu sorgu panelini
  // görebilir — bu paneldeki hiçbir sekmeye erişimleri yok.
  if (session.user.role === 'dis') redirect('/pasaport');

  // "user" hesabının yetkileri hiç yapılandırılmamışsa (varsayılan durum)
  // tüm sekmeler gösterilir — bkz. requirePanelAccess'teki geriye dönük
  // uyumluluk notu. Admin her zaman tüm sekmeleri görür.
  const isAdmin = session.user.role === 'admin';
  const permissionsConfigured =
    'permissionsConfigured' in session.user && session.user.permissionsConfigured === true;
  const grantedPanels =
    !isAdmin && permissionsConfigured
      ? await getGrantedPermissionKeys(session.user.role, session.user.id)
      : null;

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-5 sm:px-5 sm:py-7">
      <Header userName={session.user.name} userEmail={session.user.email} />
      <TabsNav isAdmin={isAdmin} grantedPanels={grantedPanels ? Array.from(grantedPanels) : null} />
      <main>{children}</main>
    </div>
  );
}

import { requireSession } from '@/lib/session';
import { Header } from '@/components/layout/header';
import { TabsNav } from '@/components/layout/tabs-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-6xl px-5 py-7">
      <Header userName={session.user.name} userEmail={session.user.email} />
      <TabsNav isAdmin={session.user.role === 'admin'} />
      {children}
    </div>
  );
}

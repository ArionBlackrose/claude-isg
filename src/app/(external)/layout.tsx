import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { Header } from '@/components/layout/header';
import { ExternalNav } from '@/components/layout/external-nav';

export default async function ExternalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  // Bu panel sadece "dis" rolündeki dış kullanıcılar (ve kontrol amacıyla
  // yöneticiler) için — normal kullanıcılar buraya yönlendirilmez.
  if (session.user.role !== 'dis' && session.user.role !== 'admin') redirect('/');

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-5 sm:py-7">
      <Header userName={session.user.name} userEmail={session.user.email} />
      <ExternalNav />
      <main>{children}</main>
    </div>
  );
}

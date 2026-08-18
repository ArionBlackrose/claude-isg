import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { Header } from '@/components/layout/header';

export default async function ExternalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  // Bu panel sadece "dis" rolündeki dış kullanıcılar (ve kontrol amacıyla
  // yöneticiler) için — normal kullanıcılar buraya yönlendirilmez.
  if (session.user.role !== 'dis' && session.user.role !== 'admin') redirect('/');

  return (
    <div className="mx-auto max-w-3xl px-5 py-7">
      <Header userName={session.user.name} userEmail={session.user.email} />
      {children}
    </div>
  );
}

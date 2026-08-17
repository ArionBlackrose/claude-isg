import { requireAdmin } from '@/lib/session';
import { AdminSubNav } from '@/components/layout/admin-sub-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 font-heading text-2xl font-bold tracking-wide uppercase">
          Admin Paneli
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Bu bölüme yalnızca tam yetkili yöneticiler erişebilir.
        </p>
        <AdminSubNav />
      </div>
      {children}
    </div>
  );
}

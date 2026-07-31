import { db } from '@/db';
import { user } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { UserCreateForm } from '@/components/admin/user-create-form';
import { UserTable } from '@/components/admin/user-table';

export default async function KullanicilarPage() {
  const session = await requireAdmin();
  const users = await db.select().from(user);

  users.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Yeni Kullanıcı Ekle
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Sisteme erişecek yeni bir kullanıcı hesabı oluşturun.
        </p>
        <UserCreateForm />
      </div>
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Kullanıcılar
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Kullanıcıların rolünü buradan değiştirebilirsiniz. Kendi rolünüzü değiştiremezsiniz.
        </p>
        <UserTable
          users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}

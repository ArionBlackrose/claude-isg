import type { Metadata } from 'next';
import { db } from '@/db';
import { user, userPermission } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { isValidPermissionKey } from '@/lib/permissions';
import { UserCreateForm } from '@/components/admin/user-create-form';
import { UserTable } from '@/components/admin/user-table';

export const metadata: Metadata = { title: 'Kullanıcılar' };

export default async function KullanicilarPage() {
  const session = await requireAdmin();
  const [users, allPermissions] = await Promise.all([
    db.select().from(user),
    db.select().from(userPermission),
  ]);

  users.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const permissionsByUserId = new Map<string, string[]>();
  for (const p of allPermissions) {
    if (!isValidPermissionKey(p.permissionKey)) continue;
    const list = permissionsByUserId.get(p.userId) ?? [];
    list.push(p.permissionKey);
    permissionsByUserId.set(p.userId, list);
  }

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
          Kullanıcıların rolünü buradan değiştirebilirsiniz. Dış kullanıcılar için hangi yetkilere
          sahip olacaklarını &quot;Yetkiler&quot; ile seçebilirsiniz. Kendi rolünüzü
          değiştiremezsiniz.
        </p>
        <UserTable
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            permissionKeys: permissionsByUserId.get(u.id) ?? [],
          }))}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}

import { db } from '@/db';
import { personnel, personnelHistory } from '@/db/schema';
import { getSession } from '@/lib/session';
import { PersonelForm } from '@/components/personel/personel-form';
import { PersonelTable, type PersonelRow } from '@/components/personel/personel-table';
import { ExcelSyncPersonel } from '@/components/personel/excel-sync-personel';

export default async function PersonelPage() {
  const [session, allPersonnel, allHistory] = await Promise.all([
    getSession(),
    db.select().from(personnel),
    db.select().from(personnelHistory),
  ]);

  allPersonnel.sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));

  const rows: PersonelRow[] = allPersonnel.map((p) => ({
    ...p,
    history: allHistory.filter((h) => h.personnelId === p.id),
  }));

  const isAdmin = session?.user.role === 'admin';

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="rounded-lg border border-border bg-panel p-5">
          <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
            Excel&apos;den Personel Senkronizasyonu
          </h2>
          <ExcelSyncPersonel />
        </div>
      )}
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Personel Manuel Ekle
        </h2>
        <PersonelForm />
      </div>
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Personel Listesi
        </h2>
        <PersonelTable rows={rows} />
      </div>
    </div>
  );
}

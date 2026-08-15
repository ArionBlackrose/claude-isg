import { db } from '@/db';
import { personnel, personnelHistory, training, trainingRecord, user } from '@/db/schema';
import { getSession } from '@/lib/session';
import { PersonelForm } from '@/components/personel/personel-form';
import { PersonelTable, type PersonelRow } from '@/components/personel/personel-table';
import { ExcelSyncPersonel } from '@/components/personel/excel-sync-personel';

export default async function PersonelPage() {
  const [session, allPersonnel, allHistory, allTrainings, allRecords, allUsers] = await Promise.all(
    [
      getSession(),
      db.select().from(personnel),
      db.select().from(personnelHistory),
      db.select().from(training),
      db.select().from(trainingRecord),
      db.select().from(user),
    ],
  );

  allPersonnel.sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));

  const trainingMap = new Map(allTrainings.map((t) => [t.id, t]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const rows: PersonelRow[] = allPersonnel.map((p) => ({
    ...p,
    history: allHistory.filter((h) => h.personnelId === p.id),
    records: allRecords
      .filter((r) => r.personnelId === p.id)
      .map((r) => ({
        id: r.id,
        trainingId: r.trainingId,
        egitimAdi: trainingMap.get(r.trainingId)?.ad ?? 'Silinmiş eğitim',
        tarih: r.tarih,
        sonuc: r.sonuc,
        not: r.not,
        driveWebViewLink: r.driveWebViewLink,
        createdByName: r.createdByUserId
          ? (userMap.get(r.createdByUserId)?.name ?? 'Silinmiş kullanıcı')
          : '-',
      }))
      .sort((a, b) => b.tarih.localeCompare(a.tarih)),
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
        <PersonelTable rows={rows} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

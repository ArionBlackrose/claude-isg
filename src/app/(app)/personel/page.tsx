import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  disciplineAction,
  personnel,
  personnelHistory,
  training,
  trainingRecord,
  user,
} from '@/db/schema';
import { canDeletePersonnel, requirePanelAccess } from '@/lib/session';
import { PersonelForm } from '@/components/personel/personel-form';
import { PersonelTable, type PersonelRow } from '@/components/personel/personel-table';
import { ExcelSyncPersonel } from '@/components/personel/excel-sync-personel';

export const metadata: Metadata = { title: 'Personel' };

export default async function PersonelPage() {
  const [session, allPersonnel, allHistory, allTrainings, allRecords, allUsers, allDiscipline] =
    await Promise.all([
      requirePanelAccess('panel.personel'),
      db.select().from(personnel),
      db.select().from(personnelHistory),
      db.select().from(training),
      db.select().from(trainingRecord),
      db.select().from(user),
      db.select().from(disciplineAction).orderBy(desc(disciplineAction.createdAt)),
    ]);

  allPersonnel.sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));

  const trainingMap = new Map(allTrainings.map((t) => [t.id, t]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // allDiscipline createdAt'a göre azalan sırada geldiğinden, bir personel
  // için karşılaşılan ilk kayıt otomatik olarak en sonuncusudur.
  const lastDisciplineByPersonnel = new Map<string, (typeof allDiscipline)[number]>();
  for (const a of allDiscipline) {
    if (!lastDisciplineByPersonnel.has(a.personnelId)) {
      lastDisciplineByPersonnel.set(a.personnelId, a);
    }
  }

  const rows: PersonelRow[] = allPersonnel.map((p) => {
    const lastAction = lastDisciplineByPersonnel.get(p.id);
    return {
      ...p,
      history: allHistory.filter((h) => h.personnelId === p.id),
      records: allRecords
        .filter((r) => r.personnelId === p.id)
        .map((r) => ({
          id: r.id,
          trainingId: r.trainingId,
          egitimAdi: trainingMap.get(r.trainingId)?.ad ?? 'Silinmiş eğitim',
          kategori: trainingMap.get(r.trainingId)?.kategori ?? null,
          tarih: r.tarih,
          sonuc: r.sonuc,
          katilimTarihi: r.katilimTarihi,
          dosyaNo: r.dosyaNo,
          not: r.not,
          driveWebViewLink: r.driveWebViewLink,
          createdByName: r.createdByUserId
            ? (userMap.get(r.createdByUserId)?.name ?? 'Silinmiş kullanıcı')
            : '-',
        }))
        .sort((a, b) => b.tarih.localeCompare(a.tarih)),
      lastDisciplineAction: lastAction
        ? {
            action: lastAction.action,
            tarih: lastAction.tarih,
            not: lastAction.not,
            appliedByName: lastAction.createdByUserId
              ? (userMap.get(lastAction.createdByUserId)?.name ?? 'Silinmiş kullanıcı')
              : '-',
          }
        : null,
    };
  });

  const isAdmin = session.user.role === 'admin';
  const canDelete = isAdmin && canDeletePersonnel(session.user.email);

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
        <PersonelTable rows={rows} isAdmin={isAdmin} canDelete={canDelete} />
      </div>
    </div>
  );
}

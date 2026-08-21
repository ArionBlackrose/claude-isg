import type { Metadata } from 'next';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { disciplineAction, personnel, training, trainingRecord, user } from '@/db/schema';
import { hasPermission, requirePanelAccess } from '@/lib/session';
import { KayitForm } from '@/components/kayit/kayit-form';
import { UyariRecordsTable, type UyariRecordRow } from '@/components/kayit/uyari-records-table';
import {
  UyariDisciplinePanel,
  type FlaggedPersonnelRow,
} from '@/components/kayit/uyari-discipline-panel';
import { createUyariRecords } from '@/actions/records';
import { addMonths, fmtDate, todayStr } from '@/lib/training-status';

const UYARI_ESIK = 3;
const UYARI_PENCERE_AY = -3;

export const metadata: Metadata = { title: 'Uyarı Eğitimleri' };

export default async function UyariEgitimleriPage() {
  const session = await requirePanelAccess('panel.uyari');
  const [canGiris, canDuzenle] = await Promise.all([
    hasPermission(session, 'uyari.giris'),
    hasPermission(session, 'uyari.duzenle'),
  ]);

  // Uyarı kategorisindeki eğitim kimlikleri, kayıt sorgusunu DB seviyesinde
  // daraltmak için önce tek başına çekilir — aksi halde trainingRecord'un
  // tamamını (tüm kategoriler, tüm personel) çekip istemci tarafında
  // filtrelemek gerekirdi.
  const uyariTrainings = await db
    .select()
    .from(training)
    .where(eq(training.kategori, 'Uyarı'))
    .orderBy(training.ad);
  const uyariTrainingIds = uyariTrainings.map((t) => t.id);

  const [allPersonnel, allUsers, uyariRecords, disciplineActions] = await Promise.all([
    db.select().from(personnel),
    db.select().from(user),
    uyariTrainingIds.length
      ? db
          .select()
          .from(trainingRecord)
          .where(inArray(trainingRecord.trainingId, uyariTrainingIds))
          .orderBy(desc(trainingRecord.tarih), desc(trainingRecord.createdAt))
      : Promise.resolve([]),
    db.select().from(disciplineAction).orderBy(desc(disciplineAction.createdAt)),
  ]);

  const uyariTrainingMap = new Map(uyariTrainings.map((t) => [t.id, t]));
  const personnelMap = new Map(allPersonnel.map((p) => [p.id, p]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const isAdmin = session.user.role === 'admin';

  const activePersonnel = allPersonnel
    .filter((p) => p.durum === 'Güncel')
    .sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));

  // Son 3 ay içinde 3 veya daha fazla Uyarı eğitimi kaydı alan personeli
  // bulur — dashboard'un tek amacı bu.
  const cutoff = addMonths(todayStr(), UYARI_PENCERE_AY);
  const recentByPersonnel = new Map<string, typeof uyariRecords>();
  for (const r of uyariRecords) {
    if (r.tarih < cutoff) continue;
    const list = recentByPersonnel.get(r.personnelId) ?? [];
    list.push(r);
    recentByPersonnel.set(r.personnelId, list);
  }
  const flagged = Array.from(recentByPersonnel.entries())
    .filter(([, list]) => list.length >= UYARI_ESIK)
    .map(([personnelId, list]) => ({
      personnelId,
      count: list.length,
      records: list.slice().sort((a, b) => b.tarih.localeCompare(a.tarih)),
    }))
    .sort((a, b) => b.count - a.count);

  // disciplineActions createdAt'a göre azalan sırada geldiğinden, bir
  // personel için karşılaşılan ilk kayıt otomatik olarak en sonuncusudur.
  const lastActionByPersonnel = new Map<string, (typeof disciplineActions)[number]>();
  for (const a of disciplineActions) {
    if (!lastActionByPersonnel.has(a.personnelId)) {
      lastActionByPersonnel.set(a.personnelId, a);
    }
  }

  const flaggedRows: FlaggedPersonnelRow[] = flagged.map((f) => {
    const p = personnelMap.get(f.personnelId);
    const last = lastActionByPersonnel.get(f.personnelId);
    return {
      personnelId: f.personnelId,
      ad: p ? `${p.ad} ${p.soyad}` : 'silinmiş personel',
      firma: p?.firma ?? null,
      count: f.count,
      recordsSummary: f.records
        .map((r) => `${uyariTrainingMap.get(r.trainingId)?.ad ?? '-'} (${fmtDate(r.tarih)})`)
        .join(', '),
      lastAction: last
        ? {
            action: last.action,
            tarih: last.tarih,
            not: last.not,
            appliedByName: last.createdByUserId
              ? (userMap.get(last.createdByUserId)?.name ?? 'silinmiş kullanıcı')
              : '-',
          }
        : null,
    };
  });

  const records: UyariRecordRow[] = uyariRecords.map((r) => {
    const p = personnelMap.get(r.personnelId);
    return {
      id: r.id,
      personelAdi: p ? `${p.ad} ${p.soyad}` : 'silinmiş personel',
      egitimAdi: uyariTrainingMap.get(r.trainingId)?.ad ?? 'silinmiş eğitim',
      tarih: r.tarih,
      sonuc: r.sonuc as 'Katılmadı' | 'Katıldı',
      katilimTarihi: r.katilimTarihi,
      dosyaNo: r.dosyaNo,
      not: r.not,
      createdByName: r.createdByUserId
        ? (userMap.get(r.createdByUserId)?.name ?? 'silinmiş kullanıcı')
        : '-',
    };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Son 3 Ayda 3+ Uyarı Eğitimi Alan Personel
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Son {Math.abs(UYARI_PENCERE_AY)} ay içinde {UYARI_ESIK} veya daha fazla Uyarı eğitimi
          kaydı alan personel burada listelenir. Her personel için hangi disiplin işleminin
          uygulandığı sorulur ve kaydedilen işlem burada gösterilir.
        </p>
        <UyariDisciplinePanel rows={flaggedRows} />
      </div>

      {canGiris && (
        <div className="rounded-lg border border-border bg-panel p-5">
          <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
            Uyarı Eğitimi Ekle
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Uyarı eğitimi kayıtları sadece bu panelden eklenebilir. Eklenen kayıtlar Kayıtlar
            sayfasında ve personelin detay görünümünde de görünür.
          </p>
          {!uyariTrainings.length ? (
            <div className="p-8 text-center text-muted-foreground">
              Henüz Uyarı kategorisinde bir eğitim türü yok — önce Eğitim Kataloğu&apos;na
              kategorisi &quot;Uyarı&quot; olan bir eğitim ekleyin.
            </div>
          ) : (
            <KayitForm
              personnel={activePersonnel.map((p) => ({
                id: p.id,
                ad: p.ad,
                soyad: p.soyad,
                tcNo: p.tcNo,
                firma: p.firma,
              }))}
              trainings={uyariTrainings.map((t) => ({ id: t.id, ad: t.ad }))}
              submitAction={createUyariRecords}
              hideQuickAdd
              mode="uyari"
            />
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Tüm Uyarı Eğitimi Kayıtları
        </h2>
        <UyariRecordsTable records={records} isAdmin={isAdmin} canEdit={canDuzenle} />
      </div>
    </div>
  );
}

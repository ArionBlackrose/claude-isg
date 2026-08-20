import type { Metadata } from 'next';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { personnel, training, trainingRecord, user } from '@/db/schema';
import { getSession } from '@/lib/session';
import { KayitForm } from '@/components/kayit/kayit-form';
import { UyariRecordsTable, type UyariRecordRow } from '@/components/kayit/uyari-records-table';
import { createUyariRecords } from '@/actions/records';
import { addMonths, fmtDate, todayStr } from '@/lib/training-status';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const UYARI_ESIK = 3;
const UYARI_PENCERE_AY = -3;

export const metadata: Metadata = { title: 'Uyarı Eğitimleri' };

export default async function UyariEgitimleriPage() {
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

  const [session, allPersonnel, allUsers, uyariRecords] = await Promise.all([
    getSession(),
    db.select().from(personnel),
    db.select().from(user),
    uyariTrainingIds.length
      ? db
          .select()
          .from(trainingRecord)
          .where(inArray(trainingRecord.trainingId, uyariTrainingIds))
          .orderBy(desc(trainingRecord.tarih), desc(trainingRecord.createdAt))
      : Promise.resolve([]),
  ]);

  const uyariTrainingMap = new Map(uyariTrainings.map((t) => [t.id, t]));
  const personnelMap = new Map(allPersonnel.map((p) => [p.id, p]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const isAdmin = session?.user.role === 'admin';

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

  const records: UyariRecordRow[] = uyariRecords.map((r) => {
    const p = personnelMap.get(r.personnelId);
    return {
      id: r.id,
      personelAdi: p ? `${p.ad} ${p.soyad}` : 'silinmiş personel',
      egitimAdi: uyariTrainingMap.get(r.trainingId)?.ad ?? 'silinmiş eğitim',
      tarih: r.tarih,
      sonuc: r.sonuc,
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
          kaydı alan personel burada listelenir.
        </p>
        {!flagged.length ? (
          <div className="p-8 text-center text-muted-foreground">
            Son {Math.abs(UYARI_PENCERE_AY)} ayda eşiği aşan personel yok.
          </div>
        ) : (
          <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
            <TableHeader>
              <TableRow>
                <TableHead>Personel</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Uyarı Sayısı</TableHead>
                <TableHead>Son Uyarı Eğitimleri</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flagged.map((f) => {
                const p = personnelMap.get(f.personnelId);
                return (
                  <TableRow key={f.personnelId}>
                    <TableCell className="font-semibold">
                      {p ? `${p.ad} ${p.soyad}` : 'silinmiş personel'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p?.firma || '-'}</TableCell>
                    <TableCell>
                      <span className="tag tag-bad">{f.count}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.records
                        .map(
                          (r) =>
                            `${uyariTrainingMap.get(r.trainingId)?.ad ?? '-'} (${fmtDate(r.tarih)})`,
                        )
                        .join(', ')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

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
            Henüz Uyarı kategorisinde bir eğitim türü yok — önce Eğitim Kataloğu&apos;na kategorisi
            &quot;Uyarı&quot; olan bir eğitim ekleyin.
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
          />
        )}
      </div>

      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Tüm Uyarı Eğitimi Kayıtları
        </h2>
        <UyariRecordsTable records={records} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

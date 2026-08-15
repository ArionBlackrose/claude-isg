import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { statusFor } from '@/lib/training-status';
import { KatalogForm } from '@/components/katalog/katalog-form';
import { KatalogTable, type KatalogRow } from '@/components/katalog/katalog-table';

export default async function KatalogPage() {
  const [session, trainings, activePersonnel, records] = await Promise.all([
    getSession(),
    db.select().from(training).orderBy(training.ad),
    db.select().from(personnel).where(eq(personnel.durum, 'Güncel')),
    db.select().from(trainingRecord),
  ]);

  const rows: KatalogRow[] = trainings.map((t) => {
    let expiredCount = 0;
    let soonCount = 0;
    for (const p of activePersonnel) {
      const status = statusFor(p.id, t.id, records, t);
      if (status.code === 'expired') expiredCount++;
      if (status.code === 'soon') soonCount++;
    }
    return {
      id: t.id,
      ad: t.ad,
      kategori: t.kategori,
      gecerlilikAy: t.gecerlilikAy,
      egitimSuresi: t.egitimSuresi,
      recordCount: records.filter((r) => r.trainingId === t.id).length,
      expiredCount,
      soonCount,
    };
  });

  const isAdmin = session?.user.role === 'admin';

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="rounded-lg border border-border bg-panel p-5">
          <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
            Yeni Eğitim Türü
          </h2>
          <KatalogForm />
        </div>
      )}
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Eğitim Kataloğu
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Eğitim adı, kategori veya geçerlilik süresini değiştirmek için &quot;Düzenle&quot;
          butonuna tıklayın.
        </p>
        <KatalogTable rows={rows} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

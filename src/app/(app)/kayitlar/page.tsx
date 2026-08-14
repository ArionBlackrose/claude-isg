import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { getSession } from '@/lib/session';
import { LogTable } from '@/components/log/log-table';

export default async function KayitlarPage() {
  const [session, allPersonnel, trainings, records] = await Promise.all([
    getSession(),
    db.select().from(personnel),
    db.select().from(training).orderBy(training.ad),
    db.select().from(trainingRecord),
  ]);

  allPersonnel.sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));

  const isAdmin = session?.user.role === 'admin';

  return (
    <div className="rounded-lg border border-border bg-panel p-5">
      <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">Kayıtlar</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Sıra No · TC Kimlik No · Adı Soyadı · Görevi · Firması · Çalışma Şekli · Çalışma Durumu ·
        ardından her eğitim için durum. Bir hücreye tıklayarak düzenleyebilirsiniz.
      </p>
      <LogTable
        personnel={allPersonnel}
        trainings={trainings}
        records={records}
        isAdmin={isAdmin}
      />
    </div>
  );
}

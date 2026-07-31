import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { RaporView } from '@/components/rapor/rapor-view';

export default async function RaporPage({
  searchParams,
}: {
  searchParams: Promise<{ egitim?: string; durum?: string }>;
}) {
  const params = await searchParams;
  const [allPersonnel, trainings, records] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training).orderBy(training.ad),
    db.select().from(trainingRecord),
  ]);

  allPersonnel.sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));
  const cikisCount = allPersonnel.filter((p) => p.durum === 'Çıkış').length;

  return (
    <RaporView
      personnel={allPersonnel}
      allPersonnelCount={allPersonnel.length}
      cikisCount={cikisCount}
      trainings={trainings}
      records={records}
      initialEgitim={params.egitim ?? 'all'}
      initialDurum={params.durum ?? 'all'}
    />
  );
}

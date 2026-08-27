import type { Metadata } from 'next';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { RaporView } from '@/components/rapor/rapor-view';
import { getProjectSettings } from '@/actions/project';
import { requirePanelAccess } from '@/lib/session';

export const metadata: Metadata = { title: 'Rapor' };

export default async function RaporPage({
  searchParams,
}: {
  searchParams: Promise<{ egitim?: string; durum?: string }>;
}) {
  await requirePanelAccess('panel.rapor');
  const params = await searchParams;
  // RaporView (client component) sadece bu alt kümeyi okur — RSC sınırından
  // geçen veriyi küçük tutmak için tam satır yerine bilerek dar bir seçim
  // yapılır (bkz. src/components/rapor/types.ts).
  const [allPersonnel, trainings, records, projectSettings] = await Promise.all([
    db
      .select({
        id: personnel.id,
        tcNo: personnel.tcNo,
        ad: personnel.ad,
        soyad: personnel.soyad,
        gorev: personnel.gorev,
        firma: personnel.firma,
        calismaSekli: personnel.calismaSekli,
        durum: personnel.durum,
      })
      .from(personnel),
    db
      .select({
        id: training.id,
        ad: training.ad,
        kategori: training.kategori,
        gecerlilikAy: training.gecerlilikAy,
        egitimSuresi: training.egitimSuresi,
      })
      .from(training)
      .orderBy(training.ad),
    db
      .select({
        personnelId: trainingRecord.personnelId,
        trainingId: trainingRecord.trainingId,
        tarih: trainingRecord.tarih,
        sonuc: trainingRecord.sonuc,
      })
      .from(trainingRecord),
    getProjectSettings(),
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
      projeBaslangicTarihi={projectSettings.baslangicTarihi}
    />
  );
}

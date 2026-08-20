import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { KayitForm } from '@/components/kayit/kayit-form';
import { ExcelImportKayit } from '@/components/kayit/excel-import-kayit';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fmtDate, tagClassForSonuc } from '@/lib/training-status';
import { RESTRICTED_TRAINING_CATEGORY } from '@/lib/training-category-rules';

export const metadata: Metadata = { title: 'Eğitim Ekle' };

export default async function KayitEklePage() {
  const [allPersonnel, trainings, recentRecords] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training).orderBy(training.ad),
    db
      .select()
      .from(trainingRecord)
      .orderBy(desc(trainingRecord.tarih), desc(trainingRecord.createdAt))
      .limit(15),
  ]);

  const activePersonnel = allPersonnel
    .filter((p) => p.durum === 'Güncel')
    .sort((a, b) => `${a.ad}${a.soyad}`.localeCompare(`${b.ad}${b.soyad}`, 'tr'));

  const allPersonnelMap = new Map(allPersonnel.map((p) => [p.id, p]));
  const trainingMap = new Map(trainings.map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">Eğitim Ekle</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Her kayıt kendi satırı olarak eklenir — mevcut hiçbir veriyi değiştirmez veya üzerine
          yazmaz.
        </p>
        <KayitForm
          personnel={activePersonnel.map((p) => ({
            id: p.id,
            ad: p.ad,
            soyad: p.soyad,
            tcNo: p.tcNo,
            firma: p.firma,
          }))}
          trainings={trainings
            .filter((t) => t.kategori !== RESTRICTED_TRAINING_CATEGORY)
            .map((t) => ({ id: t.id, ad: t.ad }))}
          quickAddExcludeCategories={[RESTRICTED_TRAINING_CATEGORY]}
        />
      </div>

      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Excel&apos;den Toplu Eğitim Kaydı Yükle
        </h2>
        <ExcelImportKayit />
      </div>

      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Son Eklenen Kayıtlar
        </h2>
        {!recentRecords.length ? (
          <div className="p-8 text-center text-muted-foreground">
            Henüz kayıt yok. Yukarıdan ilk kaydı ekleyin.
          </div>
        ) : (
          <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Personel</TableHead>
                <TableHead>Eğitim</TableHead>
                <TableHead>Sonuç</TableHead>
                <TableHead>Dosya No</TableHead>
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRecords.map((r) => {
                const p = allPersonnelMap.get(r.personnelId);
                const t = trainingMap.get(r.trainingId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{fmtDate(r.tarih)}</TableCell>
                    <TableCell>
                      {p ? (
                        `${p.ad} ${p.soyad}`
                      ) : (
                        <span className="text-muted-foreground">silinmiş</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {t ? t.ad : <span className="text-muted-foreground">silinmiş</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`tag ${tagClassForSonuc(r.sonuc)}`}>{r.sonuc}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.dosyaNo || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{r.not || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

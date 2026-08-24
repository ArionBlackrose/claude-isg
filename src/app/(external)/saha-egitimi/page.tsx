import type { Metadata } from 'next';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { getAccountFirma, requireExternalSession } from '@/lib/session';
import { KayitForm } from '@/components/kayit/kayit-form';
import { createSahaEgitimiRecords } from '@/actions/records';
import { fmtDate } from '@/lib/training-status';

export const metadata: Metadata = { title: 'Saha Eğitimi Ekle' };

export default async function SahaEgitimiPage() {
  const session = await requireExternalSession();

  // "dis" hesabına atanan firma dışındaki personel/kayıtlar hiç sorgulanmaz
  // — searchPassport'taki accountFirma deseniyle aynı (bkz. getAccountFirma):
  // admin sınırsız görür, dış kullanıcı sadece kendi firmasını.
  const accountFirma = getAccountFirma(session);

  // sahaTrainings ve allPersonnel birbirinden bağımsız sorgular — ayrı ayrı
  // await'lemek yerine paralel çalıştırılır. sahaRecords ise sahaTrainingIds'e
  // bağımlı olduğundan bu ikisinin sonucunu bekler. Firma karşılaştırması
  // SQL seviyesine taşınmadı: `personel.firma` orijinal harf büyüklüğüyle
  // saklanıyor, SQLite'ın LOWER()'ı ise tr-TR'ye özgü İ/I ayrımını
  // (JS'teki toLocaleLowerCase('tr-TR') gibi) doğru uygulamaz — bu yüzden
  // normalize edilmiş karşılaştırma burada, uygulama tarafında yapılıyor.
  const [sahaTrainings, allPersonnel] = await Promise.all([
    db.select().from(training).where(eq(training.kategori, 'Saha Eğitimi')).orderBy(training.ad),
    db.select().from(personnel),
  ]);
  const sahaTrainingIds = sahaTrainings.map((t) => t.id);

  const scopedPersonnel = allPersonnel.filter((p) => {
    if (p.durum !== 'Güncel') return false;
    if (accountFirma && (p.firma ?? '').trim().toLocaleLowerCase('tr-TR') !== accountFirma) {
      return false;
    }
    return true;
  });
  const scopedPersonnelIds = new Set(scopedPersonnel.map((p) => p.id));

  const sahaRecords = sahaTrainingIds.length
    ? await db
        .select()
        .from(trainingRecord)
        .where(inArray(trainingRecord.trainingId, sahaTrainingIds))
        .orderBy(desc(trainingRecord.tarih), desc(trainingRecord.createdAt))
    : [];
  const scopedRecords = sahaRecords.filter((r) => scopedPersonnelIds.has(r.personnelId));

  const trainingMap = new Map(sahaTrainings.map((t) => [t.id, t]));
  // Aşağıdaki tabloda sadece scopedRecords (zaten scopedPersonnelIds'e göre
  // filtrelenmiş) satırları render edilir — personnelMap'in tüm firmaların
  // personelini tutmasına gerek yok.
  const personnelMap = new Map(scopedPersonnel.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Saha Eğitimi Ekle
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          TRIC Kart, İTA, Toolbox, Bülten, OJT gibi saha eğitimlerini burada girin. Konuyu Not
          alanına yazıp eğitimi verdiğiniz personeli seçin — kayıt, personelin eğitim geçmişine
          işlenir.
        </p>
        {!sahaTrainings.length ? (
          <div className="p-8 text-center text-muted-foreground">
            Henüz Saha Eğitimi kategorisinde bir eğitim türü yok — önce admin&apos;in Eğitim
            Kataloğu&apos;na kategorisi &quot;Saha Eğitimi&quot; olan bir eğitim (TRIC Kart, İTA,
            Toolbox, Bülten, OJT vb.) eklemesi gerekiyor.
          </div>
        ) : !scopedPersonnel.length ? (
          <div className="p-8 text-center text-muted-foreground">
            Firmanıza kayıtlı güncel personel bulunamadı.
          </div>
        ) : (
          <KayitForm
            personnel={scopedPersonnel.map((p) => ({
              id: p.id,
              ad: p.ad,
              soyad: p.soyad,
              tcNo: p.tcNo,
              firma: p.firma,
            }))}
            trainings={sahaTrainings.map((t) => ({ id: t.id, ad: t.ad }))}
            submitAction={createSahaEgitimiRecords}
            hideQuickAdd
            mode="saha"
          />
        )}
      </div>

      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-4 font-heading text-xl font-bold tracking-wide uppercase">
          Son Saha Eğitimi Kayıtları
        </h2>
        {!scopedRecords.length ? (
          <p className="text-sm text-muted-foreground">Henüz kayıt eklenmedi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 pr-3">Personel</th>
                  <th className="py-2 pr-3">Eğitim</th>
                  <th className="py-2 pr-3">Tarih</th>
                  <th className="py-2 pr-3">Not</th>
                </tr>
              </thead>
              <tbody>
                {scopedRecords.map((r) => {
                  const p = personnelMap.get(r.personnelId);
                  return (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">
                        {p ? `${p.ad} ${p.soyad}` : 'silinmiş personel'}
                      </td>
                      <td className="py-2 pr-3">
                        {trainingMap.get(r.trainingId)?.ad ?? 'silinmiş eğitim'}
                      </td>
                      <td className="py-2 pr-3">{fmtDate(r.tarih)}</td>
                      <td className="py-2 pr-3">{r.not ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

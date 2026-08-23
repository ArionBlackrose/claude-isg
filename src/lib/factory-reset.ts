import { eq, isNotNull, inArray, ne, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  auditLog,
  disciplineAction,
  notificationLog,
  personnel,
  projectSettings,
  training,
  trainingRecord,
  user,
} from '@/db/schema';
import { deleteCertificateIfExists } from './drive';
import type { FactoryResetSummary, ResetCategoryKey } from './factory-reset-catalog';

export {
  ALL_RESET_CATEGORY_KEYS,
  FACTORY_RESET_CONFIRMATION_PHRASE,
  isValidResetCategoryKey,
  RESET_CATEGORIES,
  type FactoryResetSummary,
  type ResetCategoryKey,
} from './factory-reset-catalog';

/** Seçilen kategorilere göre kalıcı toplu silme yapar. Çağıran (server
 * action) admin yetkisini, whitelist'i ve onay metnini ÖNCEDEN doğrulamış
 * olmalı — bu fonksiyon sadece silme mantığını uygular, yetkilendirme
 * yapmaz.
 *
 * Sıra kasıtlıdır: Drive'daki sertifika/belge dosyaları veritabanı
 * transaction'ı BAŞARIYLA TAMAMLANDIKTAN SONRA silinir, önce değil —
 * aksi halde transaction bir hatayla geri alınırsa (rollback), Drive'dan
 * zaten geri alınamaz şekilde silinmiş dosyalara işaret eden DB satırları
 * hayalet referanslarla ortada kalırdı. Bu sırayla en kötü ihtimalde
 * (transaction başarılı, Drive silme kısmen başarısız) DB tutarlı kalır ve
 * sadece birkaç yetim Drive dosyası kalır (`driveWarnings` ile raporlanır)
 * — kabul edilebilir bir bedel, çünkü asıl hedef sistemi sıfırlamaktır.
 * "personel" ve "katalog" kategorileri cascade ile bağımlı tabloları zaten
 * temizlediği için, "egitim_kayitlari"/"uyari_kayitlari"/"disiplin" için
 * yapılan açık silmeler sadece cascade'den ARTA KALAN (silinmemiş
 * personel/eğitime ait) satırları hedef alır — bu yüzden transaction
 * içinde önce personel/katalog, sonra diğerleri silinir. */
export async function runFactoryReset(
  categoryKeys: ResetCategoryKey[],
  currentUserId: string,
): Promise<FactoryResetSummary> {
  const selected = new Set(categoryKeys);
  const counts: Partial<Record<ResetCategoryKey, number>> = {};
  const driveWarnings: string[] = [];

  // --- 1) "Uyarı" kategorisindeki eğitim kimliklerini, training tablosu
  // henüz silinmeden (katalog seçiliyse) ÖNCE okuyoruz — hem Drive dosyası
  // toplamada hem de egitim_kayitlari/uyari_kayitlari ayrımında kullanılır.
  const uyariTrainingIds =
    selected.has('egitim_kayitlari') || selected.has('uyari_kayitlari')
      ? (
          await db.select({ id: training.id }).from(training).where(eq(training.kategori, 'Uyarı'))
        ).map((t) => t.id)
      : [];

  // --- 2) Drive'da silinecek dosyaları, satırlar veritabanından gitmeden
  // ÖNCE topla (cascade sonrası referansları okuyamayız). Sadece GERÇEKTEN
  // silinecek trainingRecord satırlarının dosyaları toplanır — ör. yalnızca
  // "Eğitim Kayıtları" seçiliyken (Uyarı hariç) "Uyarı Eğitimi Kayıtları"nın
  // Drive'daki sertifikaları YANLIŞLIKLA silinmemeli, çünkü o kayıtlar
  // veritabanında kalmaya devam edecek.
  const driveFileIds: string[] = [];
  if (selected.has('personel')) {
    const rows = await db
      .select({ fileId: personnel.mykBelgeDriveFileId })
      .from(personnel)
      .where(isNotNull(personnel.mykBelgeDriveFileId));
    for (const r of rows) if (r.fileId) driveFileIds.push(r.fileId);
  }
  // "personel" veya "katalog" seçiliyse TÜM trainingRecord satırları cascade
  // ile silinecek (sırasıyla: her personelin ya da her eğitim türünün tüm
  // kayıtları) — bu durumda kategori ayrımı yapmadan tüm sertifikalar
  // toplanır. Aksi halde sadece işaretlenen alt küme (Uyarı / Uyarı-dışı)
  // toplanır.
  if (selected.has('personel') || selected.has('katalog')) {
    const rows = await db
      .select({ fileId: trainingRecord.driveFileId })
      .from(trainingRecord)
      .where(isNotNull(trainingRecord.driveFileId));
    for (const r of rows) if (r.fileId) driveFileIds.push(r.fileId);
  } else {
    if (selected.has('uyari_kayitlari') && uyariTrainingIds.length) {
      const rows = await db
        .select({ fileId: trainingRecord.driveFileId })
        .from(trainingRecord)
        .where(inArray(trainingRecord.trainingId, uyariTrainingIds));
      for (const r of rows) if (r.fileId) driveFileIds.push(r.fileId);
    }
    if (selected.has('egitim_kayitlari')) {
      const rows = await db
        .select({ fileId: trainingRecord.driveFileId })
        .from(trainingRecord)
        .where(
          uyariTrainingIds.length
            ? notInArray(trainingRecord.trainingId, uyariTrainingIds)
            : undefined,
        );
      for (const r of rows) if (r.fileId) driveFileIds.push(r.fileId);
    }
  }
  // --- 3) Veritabanı satırları — tek transaction, better-sqlite3 senkron
  // olduğu için callback async OLAMAZ. "egitim_kayitlari"/"uyari_kayitlari"/
  // "disiplin" silmeleri, "personel"/"katalog" cascade'inden ÖNCE çalıştırılır
  // ki bağımsız çalışsalar da doğru satırları hedeflediklerinden emin olalım
  // (sıra, cascade'in sonucunu etkilemez — sadece hangi satırların hâlâ var
  // olduğunu etkiler; personel/katalog zaten her şeyi süpürüyor olsa bile
  // bu bloklar 0 satır silip zararsızca biter).
  db.transaction((tx) => {
    if (selected.has('uyari_kayitlari')) {
      counts.uyari_kayitlari = uyariTrainingIds.length
        ? tx
            .delete(trainingRecord)
            .where(inArray(trainingRecord.trainingId, uyariTrainingIds))
            .run().changes
        : 0;
    }
    if (selected.has('egitim_kayitlari')) {
      counts.egitim_kayitlari = uyariTrainingIds.length
        ? tx
            .delete(trainingRecord)
            .where(notInArray(trainingRecord.trainingId, uyariTrainingIds))
            .run().changes
        : tx.delete(trainingRecord).run().changes;
    }
    if (selected.has('disiplin')) {
      counts.disiplin = tx.delete(disciplineAction).run().changes;
    }
    if (selected.has('personel')) {
      counts.personel = tx.delete(personnel).run().changes;
    }
    if (selected.has('katalog')) {
      counts.katalog = tx.delete(training).run().changes;
    }
    if (selected.has('kullanicilar')) {
      counts.kullanicilar = tx.delete(user).where(ne(user.id, currentUserId)).run().changes;
    }
    if (selected.has('proje')) {
      tx.update(projectSettings)
        .set({ projeAdi: null, aciklama: null, baslangicTarihi: null })
        .where(eq(projectSettings.id, 'default'))
        .run();
      counts.proje = 1;
    }
    if (selected.has('aktivite')) {
      counts.aktivite =
        tx.delete(auditLog).run().changes + tx.delete(notificationLog).run().changes;
    }
  });

  // --- 4) Transaction başarıyla tamamlandı — artık Drive dosyalarını
  // best-effort olarak silebiliriz. Bir dosya silinemese bile diğerleri
  // denenir; başarısız olanlar driveWarnings ile çağırana bildirilir.
  for (const fileId of driveFileIds) {
    const result = await deleteCertificateIfExists(fileId);
    if (!result.ok) driveWarnings.push(result.error);
  }

  return { counts, driveWarnings };
}

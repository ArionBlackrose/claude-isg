'use server';

import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { personnel, training, trainingRecord, trainingTopic } from '@/db/schema';
import { getAccountFirma, requireExternalSession } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { toUpperTR } from '@/lib/utils';
import { getGrantedPermissionKeys } from '@/lib/user-permissions';
import { getSahaEgitimiOnlyCreationError } from '@/lib/training-category-rules';
import { sahaEgitimiRecordSchema } from '@/schemas/saha-egitimi';
import type { RecordsBatchResult } from './records';

function revalidateSahaPaths() {
  revalidatePath('/saha-egitimi');
  revalidatePath('/kayitlar');
  revalidatePath('/rapor');
  revalidatePath('/katalog');
  revalidatePath('/personel');
}

/** Saha Eğitimi Ekle panelinden (dış kullanıcı, role='dis' veya admin)
 * çağrılır. Genel `createRecords`/`createUyariRecords` akışından bilerek
 * ayrıdır: bu panelde Sonuç/Dosya No/Not alanı yok — konu, admin'in
 * tanımladığı kataloglu bir başlıktan seçilir (ya da eğitim türü izin
 * veriyorsa "Diğer" ile serbest metin girilir, her durumda BÜYÜK HARFE
 * çevrilerek saklanır). Kayıt her zaman "Başarılı" sonuçla eklenir — bu
 * panelde başarısız/katılmadı durumu yok, sadece eğitimin verildiğinin
 * kaydı tutulur. */
export async function createSahaEgitimiRecords(input: unknown): Promise<RecordsBatchResult> {
  const session = await requireExternalSession();
  const parsed = sahaEgitimiRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }
  const { trainingId, topicId, tarih } = parsed.data;
  const personnelIds = Array.from(new Set(parsed.data.personnelIds));

  const [selectedTraining] = await db.select().from(training).where(eq(training.id, trainingId));
  const kategoriError = getSahaEgitimiOnlyCreationError(selectedTraining?.kategori);
  if (kategoriError || !selectedTraining) {
    return { ok: false, error: kategoriError ?? 'Eğitim bulunamadı.' };
  }

  // Konu çözümlemesi: kataloglu başlık mı, yoksa (sadece eğitim türü izin
  // veriyorsa) serbest "Diğer" metni mi — ikisi de değilse veya izin
  // verilmeyen bir eğitimde "Diğer" denenirse reddedilir.
  let topic: string;
  if (topicId) {
    const [selectedTopic] = await db
      .select()
      .from(trainingTopic)
      .where(eq(trainingTopic.id, topicId));
    if (!selectedTopic || selectedTopic.trainingId !== trainingId) {
      return { ok: false, error: 'Seçilen başlık bu eğitim türüne ait değil.' };
    }
    topic = selectedTopic.baslik;
  } else {
    if (!selectedTraining.digerSecenegiVar) {
      return { ok: false, error: 'Bu eğitim türünde "Diğer" seçeneği kullanılamaz.' };
    }
    topic = toUpperTR(parsed.data.manualTopic ?? '');
    if (!topic) {
      return { ok: false, error: '"Diğer" için konu yazmanız gerekiyor.' };
    }
  }

  const personRows = await db.select().from(personnel).where(inArray(personnel.id, personnelIds));
  const personRowById = new Map(personRows.map((p) => [p.id, p]));

  // Dış kullanıcı hesabı sadece KENDİ firmasının personeline kayıt
  // girebilmeli — searchPassport'taki accountFirma deseniyle aynı (bkz.
  // getAccountFirma), "pasaport.tum_firmalarda_arama" yetkisi bu paneli de
  // aynı şekilde bypass eder (admin bu sınırlamaya zaten tabi değildir).
  if (session.user.role === 'dis') {
    const permissionKeys = await getGrantedPermissionKeys(session.user.role, session.user.id);
    const canSearchAllFirms = permissionKeys.has('pasaport.tum_firmalarda_arama');
    const accountFirma = getAccountFirma(session, { bypass: canSearchAllFirms });
    for (const personnelId of personnelIds) {
      const p = personRowById.get(personnelId);
      if (!p) {
        return { ok: false, error: 'Sadece kendi firmanızın personeline kayıt ekleyebilirsiniz.' };
      }
      const personFirma = (p.firma ?? '').trim().toLocaleLowerCase('tr-TR');
      if (accountFirma && personFirma !== accountFirma) {
        return { ok: false, error: 'Sadece kendi firmanızın personeline kayıt ekleyebilirsiniz.' };
      }
    }
  }

  const inserted: { id: string; personnelId: string }[] = [];
  try {
    db.transaction((tx) => {
      for (const personnelId of personnelIds) {
        const row = tx
          .insert(trainingRecord)
          .values({
            personnelId,
            trainingId,
            tarih,
            sonuc: 'Başarılı',
            dosyaNo: null,
            not: topic,
            createdByUserId: session.user.id,
          })
          .returning()
          .get();
        inserted.push({ id: row.id, personnelId });
      }
    });
  } catch {
    return { ok: false, error: 'Kayıtlar oluşturulamadı. Hiçbir kayıt eklenmedi.' };
  }

  await Promise.all(
    inserted.map((row) => {
      const p = personRowById.get(row.personnelId);
      const label = `${p ? `${p.ad} ${p.soyad}` : 'bilinmeyen personel'} — ${selectedTraining.ad}`;
      return logActivity(
        session,
        'create',
        'kayit',
        row.id,
        label,
        `Saha eğitimi kaydı eklendi: ${tarih} — ${topic}.`,
      );
    }),
  );

  revalidateSahaPaths();
  return { ok: true, created: inserted.length };
}

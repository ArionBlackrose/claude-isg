'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { personnel, training, trainingRecord } from '@/db/schema';
import { requireSession } from '@/lib/session';
import { statusFor, type TrainingStatusCode } from '@/lib/training-status';
import { getGrantedPermissionKeys } from '@/lib/user-permissions';

export type PassportSearchInput = {
  tcNo?: string;
  ad?: string;
  soyad?: string;
  firma?: string;
};

export type PassportTrainingStatus = {
  trainingId: string;
  ad: string;
  code: TrainingStatusCode;
  label: string;
  tarih: string | null;
};

export type PassportResult = {
  id: string;
  ad: string;
  soyad: string;
  tcNo: string | null;
  firma: string | null;
  gorev: string | null;
  durum: 'Güncel' | 'Çıkış' | null;
  trainings: PassportTrainingStatus[];
};

const MAX_RESULTS = 25;
// Tek karakterli sorgularla tüm personel tablosunun taranmasını (harf harf
// deneyerek veri toplama) engellemek için her doldurulan alan en az bu
// kadar karakter içermeli.
const MIN_QUERY_LENGTH = 2;

async function requireExternalAccess() {
  const session = await requireSession();
  if (session.user.role !== 'dis' && session.user.role !== 'admin') {
    throw new Error('Bu işlem için yetkiniz yok.');
  }
  return session;
}

export type PassportSearchResponse = {
  results: PassportResult[];
  /** Admin'in bu hesap için "Sonuçları Excel olarak indirebilir" yetkisini
   * açıp açmadığı — pasaport-search.tsx "Excel İndir" butonunu buna göre
   * gösterir/gizler. */
  canExportExcel: boolean;
};

/** Girilen T.C. kimlik no / ad / soyad / firma bilgilerine göre personeli
 * bulur ve sadece admin tarafından "Pasaportta göster" olarak işaretlenmiş
 * eğitimler için durumunu döner — Eğitim Pasaportu sorgu panelinin tek veri
 * kaynağı budur. "dis" rolündeki dış kullanıcılar, hesaplarına admin
 * tarafından atanan firmayla sınırlı sonuç alır; admin sınırsız sorgular.
 * Ayrıca T.C. Kimlik No / Görev alanları ve Excel indirme, admin'in
 * "Kullanıcılar" sayfasından bu hesaba verdiği yetkilere göre kısıtlanır. */
export async function searchPassport(input: PassportSearchInput): Promise<PassportSearchResponse> {
  const session = await requireExternalAccess();
  const permissionKeys = await getGrantedPermissionKeys(session.user.role, session.user.id);
  const canSeeTcNo = permissionKeys.has('pasaport.tc_no_gor');
  const canSeeGorev = permissionKeys.has('pasaport.gorev_gor');
  const canSeeFirma = permissionKeys.has('pasaport.firma_gor');
  const canSeeDurum = permissionKeys.has('pasaport.durum_gor');
  const canSeeEgitimTarihi = permissionKeys.has('pasaport.egitim_tarihi_gor');
  const canSeeSuresiDolmusEgitim = permissionKeys.has('pasaport.suresi_dolmus_egitim_gor');
  const canSearchAllFirms = permissionKeys.has('pasaport.tum_firmalarda_arama');
  const canExportExcel = permissionKeys.has('pasaport.excel_indir');

  const tcNo = (input.tcNo ?? '').trim();
  const ad = (input.ad ?? '').trim().toLocaleLowerCase('tr-TR');
  const soyad = (input.soyad ?? '').trim().toLocaleLowerCase('tr-TR');
  const firma = (input.firma ?? '').trim().toLocaleLowerCase('tr-TR');

  if (!tcNo && !ad && !soyad && !firma) return { results: [], canExportExcel };
  const tooShort = [tcNo, ad, soyad, firma].some(
    (v) => v.length > 0 && v.length < MIN_QUERY_LENGTH,
  );
  if (tooShort) return { results: [], canExportExcel };

  // Dış kullanıcı hesabına bir firma atanmışsa (admin panelinden
  // zorunlu), sorgu sadece o firmadaki personelle sınırlanır — böylece
  // bir firmanın hesabı başka bir firmanın personelinin T.C. kimlik no
  // gibi kişisel verilerini göremez. Admin bu hesaba "Tüm firmalarda
  // arama yapabilir" yetkisini verdiyse bu sınırlama uygulanmaz.
  const accountFirma =
    session.user.role === 'dis' &&
    !canSearchAllFirms &&
    'firma' in session.user &&
    typeof session.user.firma === 'string'
      ? session.user.firma.trim().toLocaleLowerCase('tr-TR')
      : '';

  const [allPersonnel, visibleTrainings, records] = await Promise.all([
    db.select().from(personnel),
    db.select().from(training).where(eq(training.pasaportGoster, true)),
    db.select().from(trainingRecord),
  ]);

  const matches = allPersonnel.filter((p) => {
    if (accountFirma && (p.firma ?? '').toLocaleLowerCase('tr-TR') !== accountFirma) {
      return false;
    }
    if (tcNo && !(p.tcNo ?? '').includes(tcNo)) return false;
    if (ad && !p.ad.toLocaleLowerCase('tr-TR').includes(ad)) return false;
    if (soyad && !p.soyad.toLocaleLowerCase('tr-TR').includes(soyad)) return false;
    if (firma && !(p.firma ?? '').toLocaleLowerCase('tr-TR').includes(firma)) return false;
    return true;
  });

  const results = matches.slice(0, MAX_RESULTS).map((p) => ({
    id: p.id,
    ad: p.ad,
    soyad: p.soyad,
    tcNo: canSeeTcNo ? p.tcNo : null,
    firma: canSeeFirma ? p.firma : null,
    gorev: canSeeGorev ? p.gorev : null,
    durum: canSeeDurum ? p.durum : null,
    trainings: visibleTrainings
      .map((t) => {
        const status = statusFor(p.id, t.id, records, t);
        // statusFor, "valid" durumundaki eğitimlerde label'ı doğrudan tarihe
        // eşitler (bkz. src/lib/training-status.ts) — bu yüzden tarihi
        // gizlerken label'ı olduğu gibi bırakmak, "Eğitim tarihlerini
        // görebilir" yetkisini label üzerinden by-pass eder. "soon"/"expired"
        // etiketleri zaten göreli bilgi taşıdığı (tam tarih içermediği) için
        // sadece "valid" durumunda label'ı jenerik bir metinle değiştiriyoruz.
        const label = !canSeeEgitimTarihi && status.code === 'valid' ? 'Geçerli' : status.label;
        return {
          trainingId: t.id,
          ad: t.ad,
          code: status.code,
          label,
          tarih: canSeeEgitimTarihi ? status.tarih : null,
        };
      })
      .filter((t) => canSeeSuresiDolmusEgitim || t.code !== 'expired'),
  }));

  return { results, canExportExcel };
}

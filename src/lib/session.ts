import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/auth-schema';
import { auth } from './auth';
import { getGrantedPermissionKeys } from './user-permissions';
import { getPermissionDefaultWhenUnconfigured, type PermissionKey } from './permissions';

// GEÇİCİ: E-posta kodu ile giriş askıya alındı, tüm istekler otomatik
// olarak ilk admin kullanıcı olarak oturum açmış sayılıyor. Gerçek girişi
// geri açmak için bu satırı false yapmak yeterli.
// GÜVENLİK: production'da (NODE_ENV === 'production') bu bayrak ne olursa
// olsun asla etkili olmaz. Ayrıca NODE_ENV'in yanlışlıkla ayarlanmadığı
// (örn. next start yerine doğrudan node ile çalıştırılan özel bir sunucu,
// konteyner içinde NODE_ENV'in unutulduğu bir kurulum) bir ortamda bile
// bypass'ın devreye girmemesi için ayrıca ALLOW_DEV_LOGIN_BYPASS=true
// ortam değişkeninin de açıkça ayarlanmış olması gerekiyor — .env
// dosyasında bu değişken yoksa (canlı sunucularda genelde olmaz) bypass
// hiçbir koşulda çalışmaz.
const LOGIN_DISABLED_TEMPORARILY =
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_LOGIN_BYPASS === 'true';

async function bypassSession() {
  const [admin] = await db.select().from(user).where(eq(user.role, 'admin')).limit(1);
  const devUser = admin ?? (await db.select().from(user).limit(1))[0];
  if (!devUser) return null;
  return {
    user: {
      id: devUser.id,
      name: devUser.name,
      email: devUser.email,
      role: devUser.role,
      firma: devUser.firma,
      permissionsConfigured: devUser.permissionsConfigured,
    },
    session: { id: 'dev-bypass', userId: devUser.id },
  };
}

// Aynı istek (sayfa/layout render zinciri) içinde birden fazla yerden
// çağrılsa da (root layout, admin layout, sayfanın kendisi vb.) oturum
// sorgusu sadece BİR kez çalışır — React'in istek-kapsamlı cache()'i ile
// tekrar eden DB/cookie sorgularının önüne geçilir (menüler arası geçişte
// gereksiz gecikmenin ana kaynağı buydu).
export const getSession = cache(async () => {
  if (LOGIN_DISABLED_TEMPORARILY) {
    const bypassed = await bypassSession();
    if (bypassed) return bypassed as Awaited<ReturnType<typeof auth.api.getSession>>;
  }
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== 'admin') redirect('/');
  return session;
}

// "dis" (Eğitim Pasaportu dış kullanıcısı) rolündeki hesaplar sadece
// /pasaport sorgu panelini görebilmeli — personel/kayıt oluşturma veya
// düzenleme gibi normal kullanıcı işlemlerine de erişememeli. Sayfa
// düzeyinde (app)/layout.tsx bu rolü zaten /pasaport'a yönlendiriyor,
// ama server action'lar sayfa render zincirinden bağımsız doğrudan
// çağrılabildiği için mutasyon yapan her action bu korumayı ayrıca
// kendi içinde uygulamalı.
export async function requireInternalSession() {
  const session = await requireSession();
  if (session.user.role === 'dis') redirect('/pasaport');
  return session;
}

// "dis" (Eğitim Pasaportu / Saha Eğitimi dış kullanıcısı) ve "admin"
// dışındaki hesapların erişemeyeceği action'lar için ortak kapı —
// requireInternalSession'ın tam tersi: sadece dış kullanıcıya özel
// panellerde (searchPassport, createSahaEgitimiRecords vb.) kullanılır.
// redirect değil throw eder, çünkü bu action'lar sayfa render zincirinden
// bağımsız doğrudan çağrılabilir ve çağıran taraf (client component) hatayı
// kendi toast/hata mesajına çevirir.
export async function requireExternalSession() {
  const session = await requireSession();
  if (session.user.role !== 'dis' && session.user.role !== 'admin') {
    throw new Error('Bu işlem için yetkiniz yok.');
  }
  return session;
}

/** "dis" hesabına atanan firma değerini normalize edilmiş (trim + tr-TR
 * lowercase) olarak döner — admin veya firma ataması olmayan hesaplar için
 * boş string döner, bu da "sınırlama yok" anlamına gelir. searchPassport,
 * createSahaEgitimiRecords ve /saha-egitimi sayfası bu tek kaynağı
 * paylaşır; her biri ayrı ayrı aynı `.trim().toLocaleLowerCase('tr-TR')`
 * mantığını tekrar yazmak yerine buradan çağırır — böylece normalizasyonda
 * bir düzeltme gerekirse tek yerden yapılır. `bypass` true geçilirse (ör.
 * admin'in "tüm firmalarda arama" yetkisi verdiği bir dış kullanıcı hesabı)
 * sınırlama uygulanmamış gibi boş string döner. */
export function getAccountFirma(
  session: Awaited<ReturnType<typeof requireSession>>,
  { bypass = false }: { bypass?: boolean } = {},
): string {
  if (session.user.role !== 'dis' || bypass) return '';
  if (!('firma' in session.user) || typeof session.user.firma !== 'string') return '';
  return session.user.firma.trim().toLocaleLowerCase('tr-TR');
}

/** requirePanelAccess ve hasPermission arasında paylaşılan asıl kontrol —
 * admin her zaman geçer; yetkileri hiç yapılandırılmamış (permissionsConfigured
 * =false) bir hesap için PERMISSION_CATALOG'daki `defaultWhenUnconfigured`
 * alanına bakılır (bazı yetkiler geriye dönük uyumluluk için varsayılan
 * açık, bazıları — ör. uyari.duzenle — önceden daha sıkı bir kuralla
 * korunuyordu ve varsayılan kapalıdır); aksi halde gerçek granüler yetki
 * setine bakılır. */
async function isPermissionGranted(
  session: Awaited<ReturnType<typeof requireSession>>,
  key: PermissionKey,
): Promise<boolean> {
  if (session.user.role === 'admin') return true;
  if (!('permissionsConfigured' in session.user) || !session.user.permissionsConfigured) {
    return getPermissionDefaultWhenUnconfigured(key);
  }
  const granted = await getGrantedPermissionKeys(session.user.role, session.user.id);
  return granted.has(key);
}

/** "user" rolündeki hesaplar için panel bazlı erişim kontrolü — admin'in
 * "Kullanıcılar" sayfasındaki Yetkiler diyaloğundan atadığı panel.*
 * yetkilerini uygular. Hesabın yetkileri hiç yapılandırılmamışsa
 * (permissionsConfigured=false, varsayılan durum) geriye dönük uyumluluk
 * için TÜM panellere erişim varsayılır — bu özellik eklendiğinde mevcut
 * hesapların erişimi sessizce daralmaz. Admin bir kez "Yetkiler" kaydettiği
 * andan itibaren hesap sadece işaretlenen panellere erişebilir.
 *
 * requireInternalSession'ın kendi belgesindeki uyarı burada da geçerlidir:
 * server action'lar sayfa render zincirinden bağımsız doğrudan
 * çağrılabildiği için, bu paneldeki (ve o panele özgü, başka panelle
 * paylaşılmayan) her mutasyon action'ı bu korumayı da kendi içinde
 * uygulamalı — sadece page.tsx'te çağırmak yeterli değildir. */
export async function requirePanelAccess(panelKey: PermissionKey) {
  const session = await requireInternalSession();
  if (!(await isPermissionGranted(session, panelKey))) redirect('/');
  return session;
}

/** Sayfa render zincirinden bağımsız, bir server action içinden çağrılan
 * ince taneli yetki kontrolü — requirePanelAccess'ten farkı, erişim
 * reddedildiğinde redirect atmak yerine `false` dönmesidir; action'lar
 * bunu kullanıp kendi ActionResult hata mesajını üretebilir (bkz.
 * src/actions/records.ts'teki kayit.duzenle / uyari.giris / uyari.duzenle
 * kontrolleri). requirePanelAccess'in aksine burada requireInternalSession
 * ÇAĞRILMAZ — çağıran taraf zaten kendi session'ını (ör. requirePanelAccess
 * ile) almış olmalıdır. */
export async function hasPermission(
  session: Awaited<ReturnType<typeof requireSession>>,
  key: PermissionKey,
): Promise<boolean> {
  return isPermissionGranted(session, key);
}

export { canDeletePersonnel, canDeleteTraining } from './permissions';

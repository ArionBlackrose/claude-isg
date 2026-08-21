'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { user, userPermission } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { logActivity, diffSummary } from '@/lib/audit';
import { createUserSchema, updateUserSchema } from '@/schemas/user';
import {
  getPermissionKeysForRole,
  PERMISSION_CATALOG,
  PERMISSION_PRESETS,
} from '@/lib/permissions';
import type { ActionResult, CreateResult } from './training';

async function findEmailConflict(email: string, excludeId?: string) {
  const matches = await db.select().from(user).where(eq(user.email, email));
  return matches.find((u) => u.id !== excludeId) ?? null;
}

export async function createUser(input: unknown): Promise<CreateResult> {
  const session = await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const conflict = await findEmailConflict(parsed.data.email);
  if (conflict) {
    return { ok: false, error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var.' };
  }

  // Dış kullanıcı (Eğitim Pasaportu) hesapları bir firmaya bağlanmadan
  // oluşturulamaz — aksi halde sorgular tüm firmalar genelinde çalışır.
  if (parsed.data.role === 'dis' && !parsed.data.firma?.trim()) {
    return { ok: false, error: 'Dış kullanıcı için firma zorunludur.' };
  }

  const [inserted] = await db
    .insert(user)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      email: parsed.data.email,
      emailVerified: true,
      role: parsed.data.role,
      firma: parsed.data.role === 'dis' ? parsed.data.firma || null : null,
    })
    .returning();

  revalidatePath('/admin/kullanicilar');
  await logActivity(
    session,
    'create',
    'kullanici',
    inserted.id,
    inserted.name,
    `Kullanıcı eklendi (${inserted.email}, rol: ${inserted.role}).`,
  );
  return { ok: true, id: inserted.id };
}

export async function updateUser(userId: string, input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' };
  }

  const conflict = await findEmailConflict(parsed.data.email, userId);
  if (conflict) {
    return { ok: false, error: 'Bu e-posta adresiyle kayıtlı başka bir kullanıcı var.' };
  }

  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }

  await db
    .update(user)
    .set({ name: parsed.data.name, email: parsed.data.email })
    .where(eq(user.id, userId));
  revalidatePath('/admin/kullanicilar');

  const summary = diffSummary(existing, parsed.data, { name: 'Ad Soyad', email: 'E-posta' });
  await logActivity(session, 'update', 'kullanici', userId, parsed.data.name, summary);
  return { ok: true };
}

const toUpperTr = (v: string) => v.toLocaleUpperCase('tr-TR');

/** Dış kullanıcı (Eğitim Pasaportu) hesabının firma alanını günceller.
 * searchPassport artık firma karşılaştırmasını tam eşleşmeyle yapıyor,
 * bu yüzden yanlış/eksik girilmiş bir firma değerini düzeltmenin tek yolu
 * bu action — aksi halde hesap sessizce sonuç alamaz hale gelirdi. */
export async function updateUserFirma(userId: string, firma: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const trimmed = firma.trim();
  if (!trimmed) {
    return { ok: false, error: 'Firma zorunlu.' };
  }
  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }
  if (existing.role !== 'dis') {
    return { ok: false, error: 'Firma yalnızca dış kullanıcı hesapları için ayarlanabilir.' };
  }
  const nextFirma = toUpperTr(trimmed);
  await db.update(user).set({ firma: nextFirma }).where(eq(user.id, userId));
  revalidatePath('/admin/kullanicilar');
  await logActivity(
    session,
    'update',
    'kullanici',
    userId,
    existing.name,
    `Firma: "${existing.firma ?? '-'}" → "${nextFirma}".`,
  );
  return { ok: true };
}

/** Bir kullanıcının yetki anahtarlarını, gönderilen listeyle tam olarak
 * eşleşecek şekilde değiştirir (var olan tüm satırlar silinip yenileri
 * eklenir) — böylece hem ekleme hem kaldırma tek çağrıyla yapılır.
 * PERMISSION_CATALOG dışındaki anahtarlar ve hesabın rolüyle ilişkili
 * olmayan anahtarlar (ör. "user" bir hesaba pasaport.* göndermek) sessizce
 * yok sayılır — admin hiçbir zaman granüler yetkiye tabi değildir. */
export async function updateUserPermissions(
  userId: string,
  permissionKeys: string[],
): Promise<ActionResult> {
  const session = await requireAdmin();
  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }

  const allowedKeys: string[] =
    existing.role === 'admin' ? [] : getPermissionKeysForRole(existing.role);
  const allowedKeySet = new Set(allowedKeys);
  const nextKeys = Array.from(new Set(permissionKeys)).filter((k) => allowedKeySet.has(k));

  // Yetkiler diyaloğu açıkken hesabın rolü başka bir yerden (ör. Roller
  // satırından ya da başka bir admin sekmesinden) değişmişse, gönderilen
  // anahtarların TAMAMI artık hesabın GÜNCEL rolüyle uyumsuz olabilir —
  // filtre hepsini sessizce eler ve hesap sıfır yetkiyle kilitlenir. Admin
  // gerçekten hiçbir şey seçmediyse (permissionKeys zaten boş) bu normal
  // bir "tüm yetkileri kaldır" isteğidir; ama dolu bir seçim tamamen
  // filtrelendiyse bu bir rol-uyuşmazlığı belirtisidir, sessizce kaydetmek
  // yerine reddedilir.
  if (permissionKeys.length > 0 && nextKeys.length === 0) {
    return {
      ok: false,
      error:
        'Hesabın rolü değişmiş olabilir, seçtiğiniz yetkiler artık geçerli değil. Diyaloğu kapatıp tekrar açın.',
    };
  }

  try {
    db.transaction((tx) => {
      tx.delete(userPermission).where(eq(userPermission.userId, userId)).run();
      for (const permissionKey of nextKeys) {
        tx.insert(userPermission).values({ userId, permissionKey }).run();
      }
      // Admin bu hesabın yetkilerine ilk (veya bir sonraki) kez elle
      // dokunduğunu işaretler — requirePanelAccess/searchPassport bu
      // bayrak açık olmadıkça hesabı "geriye dönük uyumlu: tam erişim"
      // olarak değerlendirir. Boş bir set kaydedilse bile (tüm yetkiler
      // kaldırılsa bile) bu bilinçli bir tercihtir, tekrar false'a
      // düşürülmez.
      tx.update(user).set({ permissionsConfigured: true }).where(eq(user.id, userId)).run();
    });
  } catch {
    return { ok: false, error: 'Yetkiler kaydedilemedi. Hiçbir değişiklik uygulanmadı.' };
  }

  revalidatePath('/admin/kullanicilar');

  const labelByKey = new Map<string, string>(PERMISSION_CATALOG.map((p) => [p.key, p.label]));
  const summary = nextKeys.length
    ? `Yetkiler: ${nextKeys.map((k) => labelByKey.get(k) ?? k).join(', ')}`
    : 'Tüm yetkiler kaldırıldı.';
  await logActivity(session, 'update', 'kullanici', userId, existing.name, summary);
  return { ok: true };
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'user' | 'dis',
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { ok: false, error: 'Kendi rolünüzü değiştiremezsiniz.' };
  }
  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }
  // searchPassport'taki firma sınırlaması (dış kullanıcının sadece kendi
  // firmasını görmesi) hesabın firma alanının dolu olmasına dayanır — firma
  // boşken bu sınırlama tamamen atlanır. createUser bu yüzden dış kullanıcı
  // oluştururken firma zorunlu tutuyordu; rol değişikliği bu kontrolü
  // atlayabildiğinden burada da uygulanır.
  if (role === 'dis' && !existing.firma?.trim()) {
    return {
      ok: false,
      error:
        'Dış kullanıcı için firma zorunludur. Bu kullanıcıyı "dış kullanıcı" olarak yeniden oluşturun ya da önce firma bilgisini ayarlayın.',
    };
  }
  // Granüler yetki kataloğu role bağımlıdır (pasaport.* sadece "dis",
  // panel.* sadece "user" için anlamlıdır) — rol değiştiğinde eski
  // yetkiler yeni role hiç uymayabilir. Admin'in daha önce verdiği yetki
  // seti sessizce saklanıp hesap tekrar aynı role döndüğünde fark
  // ettirmeden geri gelmesin diye her rol değişiminde temizlenir; hesap
  // yeni rolde de "hiç yapılandırılmamış" (permissionsConfigured=false)
  // sayılır, böylece requirePanelAccess/searchPassport yeni role geçen bir
  // hesabı geriye dönük uyumluluk için varsayılan tam erişimli değerlendirir
  // — admin yetkileri tekrar elle kaydedene kadar.
  const roleChanged = existing.role !== role;
  try {
    db.transaction((tx) => {
      if (roleChanged) {
        tx.delete(userPermission).where(eq(userPermission.userId, userId)).run();
      }
      tx.update(user)
        .set(roleChanged ? { role, permissionsConfigured: false } : { role })
        .where(eq(user.id, userId))
        .run();
    });
  } catch {
    return { ok: false, error: 'Rol kaydedilemedi. Hiçbir değişiklik uygulanmadı.' };
  }
  revalidatePath('/admin/kullanicilar');
  await logActivity(
    session,
    'update',
    'kullanici',
    userId,
    existing.name,
    `Rol: "${existing.role}" → "${role}".`,
  );
  return { ok: true };
}

/** Admin panelindeki "Roller" satırının (bkz.
 * src/components/admin/user-permissions-dialog.tsx ve user-table.tsx) tek
 * gerçek kaynağı — bir temel rol (Yönetici/Kullanıcı/Dış Kullanıcı) ya da
 * bir yetki şablonu (Editör, Kontrolör vb.) seçildiğinde rol değişimi ve
 * yetki setinin uygulanmasını TEK bir db.transaction içinde yapar.
 *
 * Bundan önce bu ikisi (updateUserRole + updateUserPermissions/
 * resetUserPermissions) istemciden iki ayrı, sıralı server action çağrısı
 * olarak yapılıyordu — ilki başarılı olup ikincisi ağ/DB hatasıyla
 * başarısız olursa hesap "user" rolünde ama permissionsConfigured=false
 * (yani "yapılandırılmamış = tüm panellere tam erişim") durumunda kalıyordu,
 * tam da kısıtlayıcı bir şablon uygulanmak istenirken en açık duruma
 * düşülüyordu. Tek transaction bu ara durumu tamamen ortadan kaldırır: ya
 * hepsi ya hiçbiri kalıcı olur. */
export async function applyRoleAssignment(
  userId: string,
  assignment: { role: 'admin' | 'user' | 'dis' } | { presetKey: string },
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    return { ok: false, error: 'Kendi rolünüzü değiştiremezsiniz.' };
  }
  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }

  let role: 'admin' | 'user' | 'dis';
  // null: yetkileri varsayılana sıfırla (permissionsConfigured=false, tam
  // erişim) — temel rol butonları için. Dizi: bu anahtar setini kaydet
  // (permissionsConfigured=true) — bir şablon butonu için.
  let permissionKeys: string[] | null;
  if ('presetKey' in assignment) {
    const preset = PERMISSION_PRESETS.find((p) => p.key === assignment.presetKey);
    if (!preset) {
      return { ok: false, error: 'Geçersiz yetki şablonu.' };
    }
    role = 'user';
    permissionKeys = preset.permissionKeys;
  } else {
    role = assignment.role;
    permissionKeys = null;
  }

  if (role === 'dis' && !existing.firma?.trim()) {
    return {
      ok: false,
      error:
        'Dış kullanıcı için firma zorunludur. Bu kullanıcıyı "dış kullanıcı" olarak yeniden oluşturun ya da önce firma bilgisini ayarlayın.',
    };
  }

  try {
    db.transaction((tx) => {
      tx.delete(userPermission).where(eq(userPermission.userId, userId)).run();
      for (const permissionKey of permissionKeys ?? []) {
        tx.insert(userPermission).values({ userId, permissionKey }).run();
      }
      tx.update(user)
        .set({ role, permissionsConfigured: permissionKeys !== null })
        .where(eq(user.id, userId))
        .run();
    });
  } catch {
    return { ok: false, error: 'İşlem kaydedilemedi. Hiçbir değişiklik uygulanmadı.' };
  }

  revalidatePath('/admin/kullanicilar');
  const summary =
    'presetKey' in assignment
      ? `Rol: "${existing.role}" → "user" (şablon: ${assignment.presetKey}).`
      : `Rol: "${existing.role}" → "${role}".`;
  await logActivity(session, 'update', 'kullanici', userId, existing.name, summary);
  return { ok: true };
}

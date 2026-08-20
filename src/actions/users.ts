'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { user, userPermission } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { logActivity, diffSummary } from '@/lib/audit';
import { createUserSchema, updateUserSchema } from '@/schemas/user';
import { isValidPermissionKey, PERMISSION_CATALOG } from '@/lib/permissions';
import type { ActionResult } from './training';

async function findEmailConflict(email: string, excludeId?: string) {
  const matches = await db.select().from(user).where(eq(user.email, email));
  return matches.find((u) => u.id !== excludeId) ?? null;
}

export async function createUser(input: unknown): Promise<ActionResult> {
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
  return { ok: true };
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
 * PERMISSION_CATALOG dışındaki anahtarlar sessizce yok sayılır. */
export async function updateUserPermissions(
  userId: string,
  permissionKeys: string[],
): Promise<ActionResult> {
  const session = await requireAdmin();
  const [existing] = await db.select().from(user).where(eq(user.id, userId));
  if (!existing) {
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }

  const nextKeys = Array.from(new Set(permissionKeys)).filter(isValidPermissionKey);

  try {
    db.transaction((tx) => {
      tx.delete(userPermission).where(eq(userPermission.userId, userId)).run();
      for (const permissionKey of nextKeys) {
        tx.insert(userPermission).values({ userId, permissionKey }).run();
      }
    });
  } catch {
    return { ok: false, error: 'Yetkiler kaydedilemedi. Hiçbir değişiklik uygulanmadı.' };
  }

  revalidatePath('/admin/kullanicilar');

  const labelByKey = new Map(PERMISSION_CATALOG.map((p) => [p.key, p.label]));
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
  // Bir hesap "dış kullanıcı" olmaktan çıkarılırsa admin'in daha önce
  // verdiği granüler yetkiler (Excel indirme, tüm firmalarda arama vb.)
  // sessizce saklanmamalı — aksi halde hesap tekrar "dış kullanıcı"
  // yapıldığında admin fark etmeden eski yetki setiyle geri döner.
  if (existing.role === 'dis' && role !== 'dis') {
    db.delete(userPermission).where(eq(userPermission.userId, userId)).run();
  }
  await db.update(user).set({ role }).where(eq(user.id, userId));
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

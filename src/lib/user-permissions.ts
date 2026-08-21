import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { userPermission } from '@/db/schema';
import { ALL_PERMISSION_KEYS, isValidPermissionKey, type PermissionKey } from './permissions';

/** Bir hesaba admin tarafından verilmiş yetki anahtarlarını döner — DB'ye
 * bakan tek kaynak burasıdır; hem searchPassport ("dis" hesapları) hem
 * requirePanelAccess/hasPermission ("user" hesapları) buradan okur. Admin
 * hesapları için katalogdaki her anahtar verilmiş sayılır.
 *
 * React'in istek-kapsamlı cache()'i ile sarılı — aynı (role,userId) çifti
 * için tek bir istek/sayfa render zinciri içinde (layout.tsx, page.tsx,
 * requirePanelAccess, birden fazla hasPermission çağrısı) birden fazla yerden
 * çağrılsa da userPermission tablosuna sadece BİR kez sorgu atılır (bkz.
 * src/lib/session.ts'teki getSession'ın aynı gerekçeyle cache()'e sarılması). */
export const getGrantedPermissionKeys = cache(async function getGrantedPermissionKeys(
  role: string,
  userId: string,
): Promise<Set<PermissionKey>> {
  if (role === 'admin') {
    return new Set(ALL_PERMISSION_KEYS);
  }
  const rows = await db
    .select({ permissionKey: userPermission.permissionKey })
    .from(userPermission)
    .where(eq(userPermission.userId, userId));
  return new Set(rows.map((r) => r.permissionKey).filter(isValidPermissionKey));
});

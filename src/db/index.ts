import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_URL ?? path.join(process.cwd(), 'data', 'app.db');

// data/ klasörü repoya dahil değil (.gitignore sadece *.db dosyalarını
// hariç tutar, klasörün kendisini değil) — sıfırdan klonlanan bir
// ortamda bu klasör hiç yoktur ve better-sqlite3 dizin yoksa senkron
// olarak throw eder; bu da modül import edilir edilmez tüm sunucu
// process'ini ayağa kalkmadan çökertir. Açmadan önce garanti altına alıyoruz.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export type DbClient = typeof db;

// Ham better-sqlite3 örneği; sadece drizzle üzerinden erişilemeyen
// düşük seviye işlemler (ör. WAL-güvenli online yedekleme) için.
export { sqlite };

// Arka plan bakım görevlerini (günlük DB yedeği, haftalık eğitim durumu
// bildirimi) sunucu süreci boyunca bir kez kurar. instrumentation.ts
// yerine burada tetiklenmesinin nedeni: bu modül zaten sadece sunucu
// tarafında (server component/action) import ediliyor, dolayısıyla
// better-sqlite3 hiçbir zaman istemci paketine sızmıyor —
// instrumentation.ts'in bu Next.js sürümünde derleyici tarafından
// tarayıcı paketi için de taranmaya çalışılması (ve better-sqlite3'ün
// fs/path bağımlılıklarıyla orada patlaması) sorununu tamamen ortadan
// kaldırıyor. Dinamik import() kullanımı, bu dosyayla lib/backup.ts /
// lib/notifications.ts arasındaki döngüsel bağımlılığı (ikisi de bu
// dosyadan `sqlite`/`db` alıyor) senkron olmayan bir sınırla kırıyor.
if (process.env.NEXT_RUNTIME !== 'edge') {
  const g = globalThis as unknown as { __backgroundJobsStarted?: boolean };
  if (!g.__backgroundJobsStarted) {
    g.__backgroundJobsStarted = true;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    import('@/lib/backup').then(({ runDailyBackupIfNeeded }) => {
      const tick = () =>
        runDailyBackupIfNeeded().catch((err) =>
          console.error('[backup] Otomatik yedekleme başarısız:', err),
        );
      tick();
      setInterval(tick, ONE_HOUR_MS);
    });

    import('@/lib/notifications').then(({ runWeeklyExpiryDigestIfNeeded }) => {
      const tick = () =>
        runWeeklyExpiryDigestIfNeeded().catch((err) =>
          console.error('[notifications] Haftalık özet e-postası başarısız:', err),
        );
      tick();
      setInterval(tick, ONE_HOUR_MS);
    });
  }
}

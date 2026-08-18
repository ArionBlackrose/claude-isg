import fs from 'node:fs';
import path from 'node:path';
import { sqlite } from '@/db';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
// Günde bir yedek alındığını varsayarsak yaklaşık 2 haftalık geçmiş tutulur.
const RETENTION_COUNT = 14;

const istanbulDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });

function todayStamp(): string {
  return istanbulDateFormatter.format(new Date());
}

function hasTodaysBackup(): boolean {
  if (!fs.existsSync(BACKUP_DIR)) return false;
  const prefix = `app-${todayStamp()}`;
  return fs.readdirSync(BACKUP_DIR).some((f) => f.startsWith(prefix));
}

function pruneOldBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db'))
    .sort();
  const excess = files.length - RETENTION_COUNT;
  for (let i = 0; i < excess; i++) {
    fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
  }
}

/** Veritabanının WAL-güvenli, tutarlı bir "online backup" kopyasını
 * backups/ klasörüne alır — sunucu çalışırken ve eşzamanlı yazımlar
 * sürerken bile bozuk olmayan bir kopya garanti eder (better-sqlite3'ün
 * yerleşik backup API'si SQLite'ın backup mekanizmasını kullanır).
 * Günde birden fazla çalışmaz; sunucu yeniden başlasa da tekrar
 * tetiklenmez çünkü o günün dosyası zaten diskte bulunur. */
export async function runDailyBackupIfNeeded(): Promise<void> {
  if (hasTodaysBackup()) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, `app-${todayStamp()}-${Date.now()}.db`);
  await sqlite.backup(dest);
  pruneOldBackups();
}

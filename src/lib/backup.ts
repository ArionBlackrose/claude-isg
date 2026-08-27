import fs from 'node:fs';
import path from 'node:path';
import { sqlite } from '@/db';
import { todayStr } from './date';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
// Günde bir yedek alındığını varsayarsak yaklaşık 2 haftalık geçmiş tutulur.
const RETENTION_COUNT = 14;

function hasTodaysBackup(): boolean {
  if (!fs.existsSync(BACKUP_DIR)) return false;
  const prefix = `app-${todayStr()}`;
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
  await runManualBackup();
}

/** Günlük yedekten farklı olarak "bugün zaten yedek var mı" kontrolü
 * yapmadan HER ZAMAN yeni bir yedek dosyası oluşturur — sistem sıfırlama
 * (fabrika ayarları) gibi geri alınamaz toplu silme işlemlerinden hemen
 * önce, o ana kadarki en güncel veriyi garanti altına almak için
 * kullanılır. Dosya adı milisaniye damgası içerdiğinden aynı gün
 * içinde birden çok kez çağrılması dosya çakışmasına yol açmaz. */
export async function runManualBackup(): Promise<void> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, `app-${todayStr()}-${Date.now()}.db`);
  await sqlite.backup(dest);
  pruneOldBackups();
}

export type LastBackupInfo = { fileName: string; createdAt: Date; count: number } | null;

/** backups/ klasöründeki en güncel yedek dosyasının bilgisini döner —
 * admin panelinde "son yedek" göstergesi için kullanılır. */
export function getLastBackupInfo(): LastBackupInfo {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db'))
    .sort();
  if (!files.length) return null;
  const fileName = files[files.length - 1];
  const stat = fs.statSync(path.join(BACKUP_DIR, fileName));
  return { fileName, createdAt: stat.mtime, count: files.length };
}

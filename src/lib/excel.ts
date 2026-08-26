import { todayStr } from './date';

// `xlsx` (~500KB) yalnızca gerçekten bir Excel dosyası okunduğunda/yazıldığında
// yüklenir — bu modül sayfa açılışında import edilen birçok bileşene (dışa
// aktarma butonları vb.) dahil olduğundan, üst seviyede statik import her
// sayfanın ilk JS paketini gereksiz yere şişirir.
async function loadXlsx() {
  return import('xlsx');
}

export function normName(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('tr-TR');
}

export function splitName(full: string): { ad: string; soyad: string } {
  const parts = String(full ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ');
  if (parts.length <= 1) return { ad: parts[0] ?? '', soyad: '' };
  return { ad: parts.slice(0, -1).join(' '), soyad: parts[parts.length - 1] };
}

/** Excel'in "1899-12-30 = gün 0" seri tarih numarasını 'YYYY-AA-GG'ye çevirir
 * — tam gün sayısı olduğu için UTC/yerel saat dilimi ayrımı burada önemsizdir
 * (asıl saat dilimi hatası aşağıdaki `Date` dalında, xlsx'ten zaten bir Date
 * nesnesi olarak gelen hücrelerde ortaya çıkıyordu). */
function excelSerialToDateStr(serial: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Excel'deki hücreleri (tarih, sayı, metin) 'YYYY-AA-GG' veya string'e
 * normalize eder — `xlsx` paketine bağımlı değildir, bu yüzden lazy-load
 * edilen XLSX modülünden bağımsız olarak (ve testlerde) kullanılabilir. */
export function cellToText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    // xlsx (cellDates:true) tarihi, YEREL getter'lar (getFullYear/getMonth/getDate)
    // ile okunduğunda doğru takvim gününü verecek şekilde saat dilimini telafi
    // ederek Date nesnesi kuruyor. toISOString() (UTC) kullanmak UTC+ dilimlerinde
    // (ör. Türkiye) tarihi bir gün geriye kaydırıyordu — yerel getter'larla okumak
    // date-fns'in format()'u gibi doğru sonucu verir.
    const y = String(value.getFullYear()).padStart(4, '0');
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    // Excel seri tarih numarası olabilir (cellDates:true kullanıldığında
    // normalde buraya düşmez, ama savunma amaçlı bırakılır).
    return excelSerialToDateStr(value);
  }
  return String(value).trim();
}

export function isExcelFile(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name);
}

export async function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  if (!isExcelFile(file)) {
    throw new Error('Sadece .xlsx veya .xls uzantılı dosyalar yüklenebilir.');
  }
  const XLSX = await loadXlsx();

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normName(key)] = cellToText(value);
    }
    return normalized;
  });
}

export async function downloadWorkbook(aoa: unknown[][], sheetName: string, fileName: string) {
  const XLSX = await loadXlsx();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export function todayFileStamp(): string {
  return todayStr();
}

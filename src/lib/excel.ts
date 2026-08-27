import { formatDateOnly, todayStr } from './date';

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
 * nesnesi olarak gelen hücrelerde ortaya çıkıyordu). Excel'in ünlü "1900 artık
 * yıl" hatasını (seri 60 = var olmayan 29 Şubat 1900) taklit etmez; bu yüzden
 * 1 Mart 1900'den önceki tarihler (seri < 61) bir gün hatalı hesaplanır — bu
 * modülün gerçek girdisi (personel eğitim kayıtları) için imkansız bir aralık
 * olduğundan kasıtlı olarak düzeltilmemiştir. */
function excelSerialToDateStr(serial: number): string {
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  // date-fns'in format()'u YEREL getter'ları kullanır; UTC bileşenlerini
  // sunucunun saat dilimine bakılmaksızın doğru formatlayabilmek için önce
  // aynı Y/A/G değerlerine sahip yerel bir Date'e taşınır.
  const local = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  return formatDateOnly(local);
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
    // (ör. Türkiye) tarihi bir gün geriye kaydırırdı — date-fns'in format()'u
    // da tıpkı bunun gibi yerel getter'lara dayandığından doğru sonucu verir.
    return formatDateOnly(value);
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

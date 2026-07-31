import * as XLSX from 'xlsx';

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

/** Excel'deki hücreleri (tarih, sayı, metin) 'YYYY-AA-GG' veya string'e normalize eder. */
export function cellToText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    // Excel seri tarih numarası olabilir
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = String(parsed.y).padStart(4, '0');
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(value);
  }
  return String(value).trim();
}

export async function parseExcelFile(file: File): Promise<Record<string, string>[]> {
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

export function downloadWorkbook(aoa: unknown[][], sheetName: string, fileName: string) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export function todayFileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

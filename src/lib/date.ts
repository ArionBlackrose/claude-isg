import {
  addMonths as addMonthsFns,
  differenceInCalendarDays,
  differenceInYears,
  format,
  isAfter,
  isValid,
  parse,
} from 'date-fns';

const DATE_ONLY_FORMAT = 'yyyy-MM-dd';

/** Sunucunun yerel saat dilimi ne olursa olsun (ör. UTC bir cloud host),
 * İstanbul'daki güncel takvim gününü "YYYY-MM-DD" olarak verir — server-local
 * `new Date()`'e güvenmek, sunucu UTC'de çalışırken 00:00-03:00 İstanbul
 * saatleri arasında "bugün"ü bir gün geriye kaydırırdı. */
const istanbulDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });

/** "YYYY-MM-DD" formatındaki bir metni yerel gece yarısı Date nesnesine çevirir.
 * Ayrıştırma ve formatlama her zaman yerel saatte tutarlı yapılır — UTC'ye
 * geçiş yapılmaz, bu yüzden ay/gün hesaplarında saat dilimi kayması olmaz. */
export function parseDateOnly(dateStr: string): Date {
  return parse(dateStr, DATE_ONLY_FORMAT, new Date());
}

/** Bugünün tarihini "YYYY-MM-DD" formatında döndürür (İstanbul saatine göre,
 * sunucunun kendi yerel saat dilimi ne olursa olsun). */
export function todayStr(): string {
  return istanbulDateFormatter.format(new Date());
}

export function addMonths(dateStr: string, months: number): string {
  return format(addMonthsFns(parseDateOnly(dateStr), months), DATE_ONLY_FORMAT);
}

/** b eksi a (gün). */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseDateOnly(b), parseDateOnly(a));
}

/** "YYYY-MM-DD" -> "GG.AA.YYYY" (ekranda gösterim için). Geçersiz/boş girdide "-" döner. */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  const date = parseDateOnly(d);
  if (!isValid(date)) return d;
  return format(date, 'dd.MM.yyyy');
}

/** Doğum tarihine göre kişinin 18 yaşını doldurup doldurmadığını kontrol eder. */
export function isAtLeast18(dateStr: string): boolean {
  const birth = parseDateOnly(dateStr);
  if (!isValid(birth)) return false;
  return differenceInYears(new Date(), birth) >= 18;
}

/** Tarihin bugünden ileri bir tarih olmadığını kontrol eder. */
export function isNotFuture(dateStr: string): boolean {
  const date = parseDateOnly(dateStr);
  if (!isValid(date)) return false;
  return !isAfter(date, new Date());
}

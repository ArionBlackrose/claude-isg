import { describe, expect, it, vi } from 'vitest';
import {
  addMonths,
  daysBetween,
  daysInMonth,
  fmtDate,
  fmtDateTime,
  formatDateOnly,
  isAtLeast18,
  isNotFuture,
  isValidDateOnly,
  todayStr,
} from './date';

describe('addMonths', () => {
  it('aya ekleme yapar ve YYYY-MM-DD dondurur', () => {
    expect(addMonths('2025-01-15', 6)).toBe('2025-07-15');
  });

  it('ay sonu tasmalarini date-fns kurallarina gore ele alir', () => {
    // 31 Ocak + 1 ay -> Subat'ta 31 gun olmadigi icin ayin son gunune sabitlenir.
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
  });

  it('negatif ay (geriye gitme) destekler', () => {
    expect(addMonths('2025-07-15', -6)).toBe('2025-01-15');
  });
});

describe('daysBetween', () => {
  it('iki tarih arasindaki gun farkini hesaplar', () => {
    expect(daysBetween('2025-01-01', '2025-01-11')).toBe(10);
  });

  it('gecmis tarih icin negatif deger dondurur', () => {
    expect(daysBetween('2025-01-11', '2025-01-01')).toBe(-10);
  });
});

describe('todayStr', () => {
  it('YYYY-MM-DD formatinda ve yerel "bugun" degerini dondurur', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 7)); // yerel: 7 Mart 2025
    expect(todayStr()).toBe('2025-03-07');
    vi.useRealTimers();
  });
});

describe('fmtDate', () => {
  it('YYYY-MM-DD -> GG.AA.YYYY donusturur', () => {
    expect(fmtDate('2025-03-07')).toBe('07.03.2025');
  });

  it('null/undefined icin "-" dondurur', () => {
    expect(fmtDate(null)).toBe('-');
    expect(fmtDate(undefined)).toBe('-');
  });

  it('beklenmeyen formati oldugu gibi dondurur', () => {
    expect(fmtDate('gecersiz')).toBe('gecersiz');
  });
});

describe('isAtLeast18', () => {
  it('bugun tam 18. yas gununde olan kisiyi kabul eder', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 7));
    expect(isAtLeast18('2007-03-07')).toBe(true);
    vi.useRealTimers();
  });

  it('18 yasindan bir gun once olan kisiyi reddeder', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 6));
    expect(isAtLeast18('2007-03-07')).toBe(false);
    vi.useRealTimers();
  });

  it('gecersiz tarih icin false dondurur', () => {
    expect(isAtLeast18('gecersiz')).toBe(false);
  });
});

describe('isNotFuture', () => {
  it('bugunku tarihi kabul eder', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 7));
    expect(isNotFuture('2025-03-07')).toBe(true);
    vi.useRealTimers();
  });

  it('gelecekteki tarihi reddeder', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 7));
    expect(isNotFuture('2025-03-08')).toBe(false);
    vi.useRealTimers();
  });

  it('gecersiz tarih icin false dondurur', () => {
    expect(isNotFuture('gecersiz')).toBe(false);
  });
});

describe('daysInMonth', () => {
  it('subatta artik yil disinda 28 gun dondurur', () => {
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it('artik yilda subat icin 29 gun dondurur', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('30 ve 31 cekern aylari dogru hesaplar', () => {
    expect(daysInMonth(2025, 4)).toBe(30);
    expect(daysInMonth(2025, 1)).toBe(31);
  });
});

describe('formatDateOnly', () => {
  it('yerel bir Date nesnesini YYYY-MM-DD formatina cevirir', () => {
    expect(formatDateOnly(new Date(2025, 2, 7))).toBe('2025-03-07');
  });
});

describe('isValidDateOnly', () => {
  it('gecerli bir YYYY-MM-DD tarihini kabul eder', () => {
    expect(isValidDateOnly('2025-03-07')).toBe(true);
  });

  it('gecersiz metni reddeder', () => {
    expect(isValidDateOnly('gecersiz')).toBe(false);
  });
});

describe('fmtDateTime', () => {
  it('string girdiyi GG.AA.YYYY SS:DD formatina cevirir', () => {
    expect(fmtDateTime('2025-03-07T14:30:00')).toBe('07.03.2025 14:30');
  });

  it('Date nesnesini de kabul eder', () => {
    expect(fmtDateTime(new Date(2025, 2, 7, 9, 5))).toBe('07.03.2025 09:05');
  });
});

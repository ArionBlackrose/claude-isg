import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addMonths,
  daysBetween,
  daysInMonth,
  fmtDate,
  statusFor,
  tagClassFor,
} from './training-status';

describe('daysInMonth', () => {
  it('artık yıl şubatı için 29 döner', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('normal yıl şubatı için 28 döner', () => {
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it('31 günlük aylar için 31 döner', () => {
    expect(daysInMonth(2025, 1)).toBe(31);
  });
});

describe('addMonths', () => {
  it('normal ay ekler', () => {
    expect(addMonths('2025-01-15', 2)).toBe('2025-03-15');
  });

  it('yıl sınırını aşan ay eklemeyi doğru taşır', () => {
    expect(addMonths('2025-11-01', 3)).toBe('2026-02-01');
  });

  it('ay sonu taşmasını hedef ayın son gününe sabitler', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
});

describe('daysBetween', () => {
  it('iki tarih arasındaki gün farkını hesaplar', () => {
    expect(daysBetween('2025-01-01', '2025-01-11')).toBe(10);
    expect(daysBetween('2025-01-11', '2025-01-01')).toBe(-10);
    expect(daysBetween('2025-01-01', '2025-01-01')).toBe(0);
  });
});

describe('fmtDate', () => {
  it('YYYY-MM-DD formatını GG.AA.YYYY olarak döner', () => {
    expect(fmtDate('2025-03-07')).toBe('07.03.2025');
  });

  it('boş/null/undefined değerler için "-" döner', () => {
    expect(fmtDate(null)).toBe('-');
    expect(fmtDate(undefined)).toBe('-');
    expect(fmtDate('')).toBe('-');
  });
});

describe('tagClassFor', () => {
  it('her durum koduna doğru CSS sınıfını eşler', () => {
    expect(tagClassFor('expired')).toBe('tag-bad');
    expect(tagClassFor('soon')).toBe('tag-warn');
    expect(tagClassFor('valid')).toBe('tag-ok');
    expect(tagClassFor('none')).toBe('tag-none');
  });
});

describe('statusFor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const training = { id: 't1', gecerlilikAy: 12 };

  it('hiç başarılı kaydı olmayan kişi için "none" döner', () => {
    expect(statusFor('p1', 't1', [], training)).toEqual({
      code: 'none',
      label: 'Almadı',
      tarih: null,
    });
  });

  it('"Katılmadı" ve "Başarısız" sonuçları katılım saymaz', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-01', sonuc: 'Katılmadı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-02', sonuc: 'Başarısız' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('none');
  });

  it('yeni alınmış (geçerlilik süresi dolmamış) eğitim "valid" döner', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-05-15', sonuc: 'Başarılı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('valid');
  });

  it('süresi geçmişte dolan eğitim "expired" döner', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2023-01-01', sonuc: 'Başarılı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('expired');
  });

  it('30 gün içinde dolacak eğitim "soon" döner', () => {
    // Alım: 2024-06-25, +12 ay = bitiş 2025-06-25 — "bugün" (2025-06-15)
    // itibarıyla 10 gün kalmış.
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2024-06-25', sonuc: 'Başarılı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('soon');
  });

  it('birden fazla başarılı kayıt varsa en son tarihi baz alır', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2020-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-05-01', sonuc: 'Başarılı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).tarih).toBe('2025-05-01');
  });

  it('geçerlilik süresi tanımsız (0) ise her zaman "valid" döner', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2010-01-01', sonuc: 'Başarılı' as const },
    ];
    const noExpiry = { id: 't1', gecerlilikAy: 0 };
    expect(statusFor('p1', 't1', records, noExpiry).code).toBe('valid');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { statusFor } from './training-status';

describe('statusFor', () => {
  const training = { id: 't1', gecerlilikAy: 12 };

  it('hic basarili kayit yoksa "none" dondurur', () => {
    const result = statusFor('p1', 't1', [], training);
    expect(result).toEqual({ code: 'none', label: 'Almadı', tarih: null });
  });

  it('sadece basarisiz/katilmadi kayitlari sayilmaz', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2024-01-01', sonuc: 'Başarısız' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2024-02-01', sonuc: 'Katılmadı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('none');
  });

  it('gecerlilik suresi 0 ise sureli olmadan "valid" dondurur', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2020-01-01', sonuc: 'Başarılı' as const },
    ];
    const result = statusFor('p1', 't1', records, { id: 't1', gecerlilikAy: 0 });
    expect(result.code).toBe('valid');
  });

  it('suresi dolmus egitim icin "expired" dondurur', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2020-01-01', sonuc: 'Başarılı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('expired');
  });

  it('30 gun icinde dolacak egitim icin "soon" dondurur', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00'));
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2024-01-15', sonuc: 'Başarılı' as const },
    ];
    // gecerlilikAy=12 -> bitis 2025-01-15, "bugun" 2025-01-01 -> 14 gun kaldi
    expect(statusFor('p1', 't1', records, training).code).toBe('soon');
    vi.useRealTimers();
  });

  it('en son basarili kaydi esas alir', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2020-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2024-01-01', sonuc: 'Başarılı' as const },
    ];
    const result = statusFor('p1', 't1', records, training);
    expect(result.tarih).toBe('2024-01-01');
  });

  it('baska personel/egitimin kayitlarini karistirmaz', () => {
    const records = [
      { personnelId: 'p2', trainingId: 't1', tarih: '2024-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't2', tarih: '2024-01-01', sonuc: 'Başarılı' as const },
    ];
    expect(statusFor('p1', 't1', records, training).code).toBe('none');
  });
});

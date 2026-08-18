import { describe, expect, it } from 'vitest';
import {
  aggregateByCategory,
  aggregateByMonth,
  aggregateByTraining,
  computeOturumlar,
  monthKeyOf,
  totalAdamSaat,
} from './adam-saat';

const trainings = [
  { id: 't1', ad: 'Oryantasyon', kategori: 'Zorunlu', egitimSuresi: 2 },
  { id: 't2', ad: 'İlk Yardım', kategori: '3. Taraf', egitimSuresi: 8 },
];

describe('computeOturumlar', () => {
  it('aynı eğitim+tarih kombinasyonundaki kişileri tek oturumda gruplar', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarılı' as const },
      { personnelId: 'p2', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarılı' as const },
      { personnelId: 'p3', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarısız' as const },
    ];
    const sessions = computeOturumlar(records, trainings);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].kisiSayisi).toBe(3);
    // adam-saat = kişi sayısı x eğitim süresi x 10
    expect(sessions[0].adamSaat).toBe(3 * 2 * 10);
  });

  it('"Katılmadı" sonuçlu kayıtları katılım saymaz', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarılı' as const },
      { personnelId: 'p2', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Katılmadı' as const },
    ];
    const sessions = computeOturumlar(records, trainings);
    expect(sessions[0].kisiSayisi).toBe(1);
  });

  it('aynı kişi aynı oturumda birden fazla kayıtla görünse bile bir kez sayılır', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarısız' as const },
    ];
    const sessions = computeOturumlar(records, trainings);
    expect(sessions[0].kisiSayisi).toBe(1);
  });

  it('farklı tarihteki aynı eğitim ayrı oturum sayılır', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-11', sonuc: 'Başarılı' as const },
    ];
    expect(computeOturumlar(records, trainings)).toHaveLength(2);
  });

  it('kataloğu silinmiş bir eğitime ait kayıtları atlar', () => {
    const records = [
      {
        personnelId: 'p1',
        trainingId: 'silinmis-egitim',
        tarih: '2025-01-10',
        sonuc: 'Başarılı' as const,
      },
    ];
    expect(computeOturumlar(records, trainings)).toHaveLength(0);
  });

  it('sonuçları tarihe göre azalan sırada döner', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't2', tarih: '2025-03-01', sonuc: 'Başarılı' as const },
    ];
    const sessions = computeOturumlar(records, trainings);
    expect(sessions.map((s) => s.tarih)).toEqual(['2025-03-01', '2025-01-01']);
  });
});

describe('totalAdamSaat', () => {
  it('tüm oturumların adam-saatini toplar', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-10', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't2', tarih: '2025-02-10', sonuc: 'Başarılı' as const },
    ];
    const sessions = computeOturumlar(records, trainings);
    // t1: 1 kişi x 2 saat x 10 = 20, t2: 1 kişi x 8 saat x 10 = 80
    expect(totalAdamSaat(sessions)).toBe(100);
  });

  it('boş oturum listesi için 0 döner', () => {
    expect(totalAdamSaat([])).toBe(0);
  });
});

describe('monthKeyOf', () => {
  it('YYYY-MM-DD tarihinden YYYY-MM üretir', () => {
    expect(monthKeyOf('2025-07-23')).toBe('2025-07');
  });
});

describe('aggregateByMonth', () => {
  it('aynı aydaki oturumları toplar ve ay bazında sıralar', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-02-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-02-15', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-01', sonuc: 'Başarılı' as const },
    ];
    const result = aggregateByMonth(computeOturumlar(records, trainings));
    expect(result).toEqual([
      { month: '2025-01', total: 20 },
      { month: '2025-02', total: 40 },
    ]);
  });
});

describe('aggregateByCategory', () => {
  it('kategoriye göre gruplayıp büyükten küçüğe sıralar', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't2', tarih: '2025-01-02', sonuc: 'Başarılı' as const },
    ];
    const result = aggregateByCategory(computeOturumlar(records, trainings));
    expect(result[0]).toEqual({ kategori: '3. Taraf', total: 80 });
    expect(result[1]).toEqual({ kategori: 'Zorunlu', total: 20 });
  });
});

describe('aggregateByTraining', () => {
  it('her eğitim türü için oturum sayısı, kişi ve adam-saat toplar', () => {
    const records = [
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p2', trainingId: 't1', tarih: '2025-01-01', sonuc: 'Başarılı' as const },
      { personnelId: 'p1', trainingId: 't1', tarih: '2025-02-01', sonuc: 'Başarılı' as const },
    ];
    const result = aggregateByTraining(computeOturumlar(records, trainings));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      trainingId: 't1',
      oturumSayisi: 2,
      toplamKisi: 3,
      toplamAdamSaat: 3 * 2 * 10,
    });
  });
});

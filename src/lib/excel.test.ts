import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { cellToText, isExcelFile, normName, splitName } from './excel';

describe('normName', () => {
  it('bosluklari tekillestirir ve kirpar', () => {
    expect(normName('  Ali   Veli  ')).toBe('ALİ VELİ');
  });

  it('turkce buyuk harf donusumunu dogru yapar (i/İ, ı/I)', () => {
    expect(normName('istanbul')).toBe('İSTANBUL');
    expect(normName('ığdır')).toBe('IĞDIR');
  });

  it('null/undefined icin bos string dondurur', () => {
    expect(normName(null)).toBe('');
    expect(normName(undefined)).toBe('');
  });

  it('Excel import esleştirmesinde ayni kisiyi farkli yazimlarla eslestirir', () => {
    // syncPersonnelFromExcel / importRecordsFromExcel bu fonksiyonla eslestirme yapiyor.
    expect(normName('ali  veli')).toBe(normName('Ali Veli'));
    expect(normName(' Ali Veli ')).toBe(normName('Ali Veli'));
  });
});

describe('splitName', () => {
  it('son kelimeyi soyad, gerisini ad olarak ayirir', () => {
    expect(splitName('Ali Veli Yılmaz')).toEqual({ ad: 'Ali Veli', soyad: 'Yılmaz' });
  });

  it('tek kelimelik isimlerde soyad bos kalir', () => {
    expect(splitName('Ali')).toEqual({ ad: 'Ali', soyad: '' });
  });

  it('fazladan bosluklari toplar', () => {
    expect(splitName('  Ali    Veli  ')).toEqual({ ad: 'Ali', soyad: 'Veli' });
  });
});

describe('isExcelFile', () => {
  it('xlsx ve xls uzantilarini kabul eder', () => {
    expect(isExcelFile(new File([], 'kayit.xlsx'))).toBe(true);
    expect(isExcelFile(new File([], 'kayit.XLS'))).toBe(true);
  });

  it('diger uzantilari reddeder', () => {
    expect(isExcelFile(new File([], 'kayit.csv'))).toBe(false);
    expect(isExcelFile(new File([], 'kayit'))).toBe(false);
  });
});

describe('cellToText', () => {
  it('null/undefined icin bos string dondurur', () => {
    expect(cellToText(null)).toBe('');
    expect(cellToText(undefined)).toBe('');
  });

  it('yerel takvim gunune gore Date degerini YYYY-MM-DD formatina cevirir', () => {
    // xlsx (cellDates:true) Date nesnesini, yerel getter'lar (getFullYear/
    // getMonth/getDate) ile okundugunda dogru takvim gununu verecek sekilde
    // olusturur — bu yuzden test de yerel constructor kullanir.
    expect(cellToText(new Date(2025, 2, 7))).toBe('2025-03-07');
  });

  it('gercek bir .xlsx tarih hucresini calisma saat diliminden bagimsiz dogru okur', () => {
    // Regresyon testi: toISOString() (UTC) kullanmak, UTC+ dilimlerinde
    // (ör. Turkiye, UTC+3) xlsx'ten okunan tarihleri bir gun geriye kaydiriyordu.
    const ws = XLSX.utils.aoa_to_sheet([['TARIH'], [new Date(2025, 2, 7)]]);
    ws['A2'].t = 'n';
    ws['A2'].z = 'yyyy-mm-dd';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const wb2 = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb2.Sheets['S'], {
      defval: '',
    });
    expect(cellToText(rows[0]['TARIH'])).toBe('2025-03-07');
  });

  it('metni kirpar', () => {
    expect(cellToText('  Ali Veli  ')).toBe('Ali Veli');
  });
});

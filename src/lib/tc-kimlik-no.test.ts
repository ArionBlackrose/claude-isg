import { describe, expect, it } from 'vitest';
import { isValidTcKimlikNo } from './tc-kimlik-no';

describe('isValidTcKimlikNo', () => {
  it('geçerli bir T.C. kimlik no için true döner', () => {
    // Resmi checksum algoritmasına göre üretilmiş geçerli bir örnek.
    expect(isValidTcKimlikNo('10000000146')).toBe(true);
  });

  it('11 haneden farklı uzunluktaki değerler için false döner', () => {
    expect(isValidTcKimlikNo('1234567890')).toBe(false);
    expect(isValidTcKimlikNo('123456789012')).toBe(false);
    expect(isValidTcKimlikNo('')).toBe(false);
  });

  it('rakam olmayan karakterler için false döner', () => {
    expect(isValidTcKimlikNo('1234567890a')).toBe(false);
  });

  it('ilk hanesi 0 olan değerler için false döner', () => {
    expect(isValidTcKimlikNo('01000000146')).toBe(false);
  });

  it('kontrol basamağı yanlışsa false döner', () => {
    expect(isValidTcKimlikNo('10000000147')).toBe(false);
  });

  it('rastgele/sahte bir 11 haneli sayı için false döner', () => {
    expect(isValidTcKimlikNo('11111111111')).toBe(false);
  });
});

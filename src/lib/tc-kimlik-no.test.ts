import { describe, expect, it } from 'vitest';
import { isValidTcKimlikNo } from './tc-kimlik-no';

describe('isValidTcKimlikNo', () => {
  it('kabul eder: gecerli bir TC Kimlik No', () => {
    expect(isValidTcKimlikNo('10000000146')).toBe(true);
  });

  it('reddeder: 11 haneden farkli uzunluk', () => {
    expect(isValidTcKimlikNo('123456789')).toBe(false);
    expect(isValidTcKimlikNo('123456789012')).toBe(false);
  });

  it('reddeder: rakam olmayan karakter', () => {
    expect(isValidTcKimlikNo('1234567890a')).toBe(false);
  });

  it('reddeder: ilk hane 0', () => {
    expect(isValidTcKimlikNo('01234567890')).toBe(false);
  });

  it('reddeder: 10. hane kontrol basamagi yanlis', () => {
    expect(isValidTcKimlikNo('10000000156')).toBe(false);
  });

  it('reddeder: 11. hane kontrol basamagi yanlis', () => {
    expect(isValidTcKimlikNo('10000000147')).toBe(false);
  });

  it('reddeder: bos string', () => {
    expect(isValidTcKimlikNo('')).toBe(false);
  });
});

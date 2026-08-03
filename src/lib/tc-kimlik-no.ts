/** T.C. Kimlik Numarası doğrulama — resmi checksum algoritması.
 * Kurallar: 11 hane, ilk hane 0 olamaz, 10. ve 11. hane kontrol basamaklarıdır.
 * (1,3,5,7,9. hanelerin toplamı × 7) − (2,4,6,8. hanelerin toplamı), mod 10 → 10. hane
 * (ilk 10 hanenin toplamı), mod 10 → 11. hane */
export function isValidTcKimlikNo(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (value[0] === '0') return false;

  const digits = value.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const digit10 = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  if (digit10 !== digits[9]) return false;

  const first10Sum = digits.slice(0, 10).reduce((sum, d) => sum + d, 0);
  const digit11 = first10Sum % 10;
  return digit11 === digits[10];
}

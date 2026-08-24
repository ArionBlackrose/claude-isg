import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Türkçe harf kurallarına göre (İ/I, ı/i ayrımı) büyük harfe çevirir ve
 * baştaki/sondaki boşlukları temizler — Saha Eğitimi başlıkları ve "Diğer"
 * serbest metin girişleri için tek normalizasyon kaynağı: kullanıcı küçük
 * harfle yazsa bile sunucu tarafında burada zorla büyük harfe çevrilir.
 * Not: bu SADECE harf büyüklüğünü düzeltir — gerçek bir yazım/imla denetimi
 * (sözlük tabanlı) değildir, böyle bir denetim bu projede mevcut değildir. */
export function toUpperTR(text: string): string {
  return text.trim().toLocaleUpperCase('tr-TR');
}

'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const THEME_COLORS: Record<string, string> = {
  dark: '#14181c',
  light: '#f4f6f8',
};

/** `<meta name="theme-color">` etiketini, işletim sistemi ayarı yerine
 * kullanıcının ThemeSwitcher'dan seçtiği gerçek temaya göre günceller —
 * aksi halde tarayıcı chrome rengi seçili temayla uyumsuz kalır. */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = THEME_COLORS[resolvedTheme];
    if (!color) return;
    // querySelectorAll: birden fazla theme-color etiketi varsa (ör. eski bir
    // önbellek veya medya sorgulu bir varyant) hepsi güncellenir — sadece
    // ilkini güncelleyip diğerini eski OS-bazlı değerde bırakmamak için.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', color));
  }, [resolvedTheme]);

  return null;
}

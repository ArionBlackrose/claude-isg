'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'dark', label: 'Koyu', icon: MoonIcon },
  { value: 'light', label: 'Açık', icon: SunIcon },
] as const;

const emptySubscribe = () => () => {};

/** next-themes sunucu tarafında bilinemeyen bir değer döndürür; hydration
 * uyuşmazlığını efekt içinde setState yerine useSyncExternalStore ile önler. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Sağ üstte görüntülenen koyu/açık arayüz seçici. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-panel-2 p-0.5"
      role="radiogroup"
      aria-label="Arayüz teması"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

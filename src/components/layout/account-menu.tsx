'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronDownIcon, LogOutIcon, MoonIcon, SunIcon, UserRoundCogIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';

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

/** Başlıktaki kullanıcı adına tıklanınca açılan menü — hesap bilgisi, tema
 * seçimi ve oturum işlemlerini tek yerde toplar. */
export function AccountMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-[220px] items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
        <span className="truncate">{userName}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-1.5 py-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{userName}</span>
            <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={mounted ? theme : undefined} onValueChange={setTheme}>
          <DropdownMenuLabel>Tema</DropdownMenuLabel>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon /> Koyu
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <SunIcon /> Açık
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSignOut}>
            <UserRoundCogIcon /> Hesap Değiştir
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOutIcon /> Çıkış Yap
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

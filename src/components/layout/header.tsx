import Link from 'next/link';
import { AccountMenu } from './account-menu';
import { LogoMark } from './logo-mark';

export function Header({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-primary pb-4">
      <div className="flex items-center gap-3.5">
        <Link href="/" aria-label="Ana sayfaya git" className="shrink-0 text-primary">
          <LogoMark className="h-11 w-11" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl leading-none font-extrabold tracking-wide uppercase sm:text-[30px]">
            İSG-Ç Takip Sistemi
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <AccountMenu userName={userName} userEmail={userEmail} />
      </div>
    </header>
  );
}

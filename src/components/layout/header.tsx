import { LogoutButton } from './logout-button';

export function Header({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-primary pb-4">
      <div className="flex items-center gap-3.5">
        <div>
          <h1 className="font-heading text-[30px] leading-none font-extrabold tracking-wide uppercase">
            İSG-Ç Eğitim Takip Sistemi
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-medium text-foreground">{userName}</div>
          <div>{userEmail}</div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

import { LogoutButton } from './logout-button';

export function Header({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-primary pb-4">
      <div className="flex items-center gap-3.5">
        <div
          className="bg-primary px-3.5 py-2 font-heading text-[15px] font-extrabold tracking-wide text-primary-foreground"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)',
          }}
        >
          REC · TSK
        </div>
        <div>
          <h1 className="font-heading text-[30px] leading-none font-extrabold tracking-wide uppercase">
            Eğitim Takip Sistemi
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Personel · Eğitim Kataloğu · Kayıt Logu
          </p>
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

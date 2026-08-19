'use client';

import { expiryStatus, tagClassFor } from '@/lib/training-status';
import { useMykBelgesi } from './use-myk-belgesi';

/** personel-table.tsx ve personel-detay-dialog.tsx tarafından ortak
 * kullanılan MYK belgesi görüntüle/yükle/kaldır alanı. */
export function MykBelgesiField({
  personnelId,
  webViewLink,
  gecerlilikTarihi = null,
  emptyLabel,
  size = 'sm',
  showGecerlilikInput = false,
}: {
  personnelId: string;
  webViewLink: string | null;
  gecerlilikTarihi?: string | null;
  emptyLabel: string;
  size?: 'sm' | 'md';
  /** Geçerlilik tarihini düzenlemek için bir tarih girişi gösterir (yalnızca detay diyaloğunda). */
  showGecerlilikInput?: boolean;
}) {
  const { isPending, upload, remove, setGecerlilikTarihi, ConfirmDialog } =
    useMykBelgesi(personnelId);
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const status = expiryStatus(gecerlilikTarihi);

  return (
    <>
      {webViewLink ? (
        <div className={`flex flex-wrap items-center gap-2 ${textSize}`}>
          <a
            href={webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {size === 'sm' ? 'Görüntüle' : 'Belgeyi Görüntüle'}
          </a>
          <button
            type="button"
            className="text-muted-foreground hover:text-danger"
            disabled={isPending}
            onClick={remove}
          >
            Kaldır
          </button>
          {status && <span className={`tag ${tagClassFor(status.code)}`}>{status.label}</span>}
          {showGecerlilikInput && (
            <label className="flex items-center gap-1.5 text-muted-foreground">
              Geçerlilik:
              <input
                type="date"
                className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                defaultValue={gecerlilikTarihi ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (gecerlilikTarihi ?? '')) {
                    setGecerlilikTarihi(e.target.value || null);
                  }
                }}
              />
            </label>
          )}
        </div>
      ) : (
        <label
          className={`cursor-pointer text-muted-foreground hover:text-foreground ${textSize} ${
            size === 'md' ? 'inline-block' : ''
          }`}
        >
          {isPending ? 'Yükleniyor...' : emptyLabel}
          <input
            type="file"
            className="hidden"
            disabled={isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {ConfirmDialog}
    </>
  );
}

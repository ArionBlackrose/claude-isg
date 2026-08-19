'use client';

import { useMykBelgesi } from './use-myk-belgesi';

/** personel-table.tsx ve personel-detay-dialog.tsx tarafından ortak
 * kullanılan MYK belgesi görüntüle/yükle/kaldır alanı. */
export function MykBelgesiField({
  personnelId,
  webViewLink,
  emptyLabel,
  size = 'sm',
}: {
  personnelId: string;
  webViewLink: string | null;
  emptyLabel: string;
  size?: 'sm' | 'md';
}) {
  const { isPending, upload, remove } = useMykBelgesi(personnelId);
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (webViewLink) {
    return (
      <div className={`flex items-center gap-2 ${textSize}`}>
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
      </div>
    );
  }

  return (
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
  );
}

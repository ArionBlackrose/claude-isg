'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/hooks/use-confirm';
import { factoryReset } from '@/actions/system-reset';
import {
  FACTORY_RESET_CONFIRMATION_PHRASE,
  RESET_CATEGORIES,
  type ResetCategoryKey,
} from '@/lib/factory-reset-catalog';
import { fmtDateTime } from '@/lib/training-status';
import type { LastBackupInfo } from '@/lib/backup';

const ALL_KEYS: ResetCategoryKey[] = RESET_CATEGORIES.map((c) => c.key);

export function FactoryResetForm({ lastBackup }: { lastBackup: LastBackupInfo }) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [selected, setSelected] = useState<Set<ResetCategoryKey>>(new Set());
  const [confirmationText, setConfirmationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(key: ResetCategoryKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(ALL_KEYS));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const phraseMatches = confirmationText.trim() === FACTORY_RESET_CONFIRMATION_PHRASE;
  const canSubmit = selected.size > 0 && phraseMatches && !isSubmitting;

  async function handleSubmit() {
    const labels = RESET_CATEGORIES.filter((c) => selected.has(c.key)).map((c) => c.label);
    const proceed = await confirm({
      title: 'Bu işlem geri alınamaz',
      description: `Şu kategoriler kalıcı olarak silinecek:\n\n${labels.map((l) => `• ${l}`).join('\n')}\n\nSilmeden önce otomatik bir veritabanı yedeği alınacak, ama bu ekrandan devam ederseniz veriler doğrudan silinir. Emin misiniz?`,
      confirmLabel: 'Evet, sil',
      destructive: true,
    });
    if (!proceed) return;

    setIsSubmitting(true);
    const result = await factoryReset(Array.from(selected), confirmationText);
    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const countsText = Object.entries(result.summary.counts)
      .map(([key, count]) => {
        const label = RESET_CATEGORIES.find((c) => c.key === key)?.label ?? key;
        return `${label}: ${count}`;
      })
      .join(', ');
    toast.success(`Sıfırlama tamamlandı. ${countsText}`);
    if (result.summary.driveWarnings.length) {
      toast.warning(
        `${result.summary.driveWarnings.length} Drive dosyası silinemedi, elle temizlenmesi gerekebilir.`,
      );
    }
    setSelected(new Set());
    setConfirmationText('');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel-2 p-4 text-xs text-muted-foreground">
        {lastBackup ? (
          <>
            Son otomatik yedek:{' '}
            <span className="font-mono">{fmtDateTime(lastBackup.createdAt)}</span> (
            {lastBackup.count} yedek dosyası saklanıyor). Sıfırlamadan hemen önce, bu yedekten
            bağımsız olarak yeni bir yedek daha alınacak.
          </>
        ) : (
          'Henüz hiç yedek alınmamış — sıfırlamadan hemen önce ilk yedek otomatik alınacak.'
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Silinecek Veri Kategorileri
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              Tümünü Seç
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-muted-foreground hover:underline"
            >
              Temizle
            </button>
          </div>
        </div>
        <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
          {RESET_CATEGORIES.map((cat) => (
            <label key={cat.key} className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-primary"
                checked={selected.has(cat.key)}
                onChange={() => toggle(cat.key)}
              />
              <span>
                <span className="font-semibold">{cat.label}</span>
                <span className="block text-xs text-muted-foreground">{cat.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm">
          Devam etmek için tam olarak{' '}
          <span className="font-mono font-semibold">{FACTORY_RESET_CONFIRMATION_PHRASE}</span> yazın
        </Label>
        <Input
          id="reset-confirm"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={FACTORY_RESET_CONFIRMATION_PHRASE}
          className="max-w-sm"
        />
      </div>

      <Button
        variant="destructive"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="disabled:opacity-50"
      >
        {isSubmitting ? 'Sıfırlanıyor...' : 'Seçili Verileri Kalıcı Olarak Sil'}
      </Button>

      {ConfirmDialog}
    </div>
  );
}

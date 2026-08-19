'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/** window.confirm yerine kullanılan, promise tabanlı bir onay diyaloğu.
 * `confirm(...)` çağrısı kullanıcı bir seçim yapana kadar bekler, `ConfirmDialog`
 * JSX'i bileşenin çıktısında bir kere render edilmelidir. */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOpen(false);
    resolver.current?.(result);
    resolver.current = null;
  }

  const ConfirmDialog = (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title ?? 'Emin misiniz?'}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {options?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="secondary" onClick={() => settle(false)}>
            {options?.cancelLabel ?? 'İptal'}
          </Button>
          <Button
            variant={options?.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? 'Onayla'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}

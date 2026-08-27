'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { PAGE_SIZE_OPTIONS } from '@/hooks/use-pagination';

/** Sayfa başına eleman seçimi + önceki/sonraki gezinme çubuğu. */
export function PaginationBar({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Sayfa başına:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v) || PAGE_SIZE_OPTIONS[0])}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Önceki
        </Button>
        <span className="relative inline-grid text-xs text-muted-foreground">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={page}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="col-start-1 row-start-1"
            >
              Sayfa {page} / {totalPages}
            </motion.span>
          </AnimatePresence>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
}

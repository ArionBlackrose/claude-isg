import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [25, 50, 100];

/** Sayfalama state'ini yönetir: filtre değiştiğinde sayfayı 1'e sıfırlayan
 * yardımcılarla birlikte. `totalItems` her render'da güncel filtrelenmiş
 * eleman sayısı olmalı. */
export function usePagination(totalItems: number) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  /** Bir filtre setter'ını, değer değiştiğinde sayfayı 1'e sıfırlayacak
   * şekilde sarmalar. */
  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return { page, setPage, pageSize, totalPages, changePageSize, withPageReset };
}

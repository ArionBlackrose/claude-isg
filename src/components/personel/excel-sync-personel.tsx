'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { syncPersonnelFromExcel } from '@/actions/personnel';
import { downloadWorkbook, parseExcelFile, todayFileStamp } from '@/lib/excel';

const TEMPLATE_HEADERS = [
  'FİRMA ADI',
  'ADI SOYADI',
  'TC KİMLİK NO',
  'GÖREV',
  'DOĞUM TARİHİ',
  'İŞE GİRİŞ TARİHİ',
];

export function ExcelSyncPersonel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function handleTemplateDownload() {
    downloadWorkbook(
      [
        TEMPLATE_HEADERS,
        ['Örnek A.Ş.', 'Ahmet Yılmaz', '12345678901', 'Operatör', '1990-01-15', '2022-03-01'],
      ],
      'Personel',
      `personel-sablon-${todayFileStamp()}.xlsx`,
    );
  }

  async function handleSync() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Lütfen bir Excel dosyası seçin.');
      return;
    }
    setIsSyncing(true);
    setResult(null);
    try {
      const rows = await parseExcelFile(file);
      const res = await syncPersonnelFromExcel(rows);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult(
        `${res.created} yeni personel eklendi · ${res.updated} personel güncellendi · ${res.markedExit} personel "Çıkış" olarak işaretlendi${res.skipped ? ` · ${res.skipped} satır atlandı (ad soyad eksik)` : ''}.`,
      );
      toast.success('Personel senkronizasyonu tamamlandı.');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel dosyası okunamadı.');
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        FİRMA ADI, ADI SOYADI, TC KİMLİK NO, GÖREV, DOĞUM TARİHİ, İŞE GİRİŞ TARİHİ sütunlarını
        içeren güncel çalışan listesini yükleyin. Eşleştirme önce <b>TC Kimlik No</b>, bulunamazsa{' '}
        <b>Ad Soyad</b> ile yapılır. Listede olmayan mevcut personel otomatik &quot;Çıkış&quot;
        olarak işaretlenir.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={handleTemplateDownload}>
        Şablon İndir (.xlsx)
      </Button>
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="max-w-72 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm"
        />
        <Button type="button" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? 'Senkronize ediliyor...' : "Excel'den Senkronize Et"}
        </Button>
      </div>
      {result && <p className="text-sm text-success">{result}</p>}
    </div>
  );
}

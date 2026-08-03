'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { importRecordsFromExcel, type RecordImportSkip } from '@/actions/records';
import { downloadWorkbook, parseExcelFile, todayFileStamp } from '@/lib/excel';

const TEMPLATE_HEADERS = ['TC KİMLİK NO', 'AD SOYAD', 'EĞİTİM ADI', 'TARİH', 'SONUÇ', 'NOT'];

export function ExcelImportKayit() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<RecordImportSkip[]>([]);

  function handleTemplateDownload() {
    downloadWorkbook(
      [
        TEMPLATE_HEADERS,
        ['12345678901', 'Ahmet Yılmaz', 'İSG Temel Eğitimi', '2026-01-15', 'Başarılı', ''],
      ],
      'Kayıtlar',
      `egitim-kaydi-sablon-${todayFileStamp()}.xlsx`,
    );
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Lütfen bir Excel dosyası seçin.');
      return;
    }
    setIsImporting(true);
    setSummary(null);
    setSkipped([]);
    try {
      const rows = await parseExcelFile(file);
      const res = await importRecordsFromExcel(rows);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSummary(
        `${res.imported} kayıt eklendi${res.egitimCreated ? ` · ${res.egitimCreated} yeni eğitim türü oluşturuldu` : ''}${res.skipped.length ? ` · ${res.skipped.length} satır atlandı` : ''}.`,
      );
      setSkipped(res.skipped);
      toast.success('Excel içe aktarma tamamlandı.');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel dosyası okunamadı.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Sütunlar: <b>TC Kimlik No</b> (veya Ad Soyad), <b>Eğitim Adı</b>, <b>Tarih</b>, <b>Sonuç</b>{' '}
        (Başarılı/Başarısız/Katılmadı, boşsa Başarılı sayılır), <b>Not</b> (opsiyonel). Personel TC
        Kimlik No veya Ad Soyad ile eşleştirilir — eşleşmezse satır atlanır. Eğitim
        Kataloğu&apos;nda olmayan eğitim adları otomatik olarak yeni bir eğitim türü olarak
        oluşturulur.
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
        <Button type="button" onClick={handleImport} disabled={isImporting}>
          {isImporting ? 'Yükleniyor...' : "Excel'den Yükle"}
        </Button>
      </div>
      {summary && <p className="text-sm text-success">{summary}</p>}
      {skipped.length > 0 && (
        <div className="rounded-md border border-border bg-panel-2 p-3 text-xs text-muted-foreground">
          <b className="text-danger">Atlanan satırlar:</b>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {skipped.map((s, i) => (
              <li key={i}>
                Satır {s.row}: {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

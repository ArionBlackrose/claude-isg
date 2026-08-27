'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtDate, toneForDurum } from '@/lib/training-status';
import { StatusTag } from '@/components/ui/status-tag';
import { downloadWorkbook, todayFileStamp } from '@/lib/excel';
import { searchPassport, type PassportResult } from '@/actions/passport';

const EMPTY_FORM = { tcNo: '', ad: '', soyad: '', firma: '' };

export function PasaportSearch() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [results, setResults] = useState<PassportResult[] | null>(null);
  const [canExportExcel, setCanExportExcel] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tcNo.trim() && !form.ad.trim() && !form.soyad.trim() && !form.firma.trim()) {
      toast.error('En az bir alan girin (T.C. Kimlik No, Ad, Soyad veya Firma).');
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchPassport(form);
      setResults(data.results);
      setCanExportExcel(data.canExportExcel);
    } catch {
      toast.error('Sorgulama sırasında bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  }

  function handleExcelExport() {
    if (!results?.length) return;
    const header = [
      'Ad Soyad',
      'T.C. Kimlik No',
      'Görev',
      'Firma',
      'Durum',
      'Eğitim',
      'Durum',
      'Tarih',
    ];
    const rows: (string | null)[][] = [];
    for (const p of results) {
      if (!p.trainings.length) {
        rows.push([`${p.ad} ${p.soyad}`, p.tcNo, p.gorev, p.firma, p.durum, '-', '-', '-']);
        continue;
      }
      for (const t of p.trainings) {
        rows.push([
          `${p.ad} ${p.soyad}`,
          p.tcNo,
          p.gorev,
          p.firma,
          p.durum,
          t.ad,
          t.label,
          t.tarih,
        ]);
      }
    }
    downloadWorkbook(
      [header, ...rows],
      'Eğitim Pasaportu',
      `egitim-pasaportu-${todayFileStamp()}.xlsx`,
    ).catch(() => toast.error('Excel dosyası oluşturulamadı.'));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-5">
        <h2 className="mb-1 font-heading text-xl font-bold tracking-wide uppercase">
          Eğitim Pasaportu Sorgu
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Çalışanın T.C. Kimlik No, Ad, Soyad veya Firma bilgisini girerek, yöneticinin bu panelde
          gösterilmek üzere seçtiği eğitimlerdeki durumunu sorgulayın.
        </p>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tcNo">T.C. Kimlik No</Label>
            <Input
              id="tcNo"
              value={form.tcNo}
              onChange={(e) => setForm((f) => ({ ...f, tcNo: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad">Ad</Label>
            <Input
              id="ad"
              value={form.ad}
              onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="soyad">Soyad</Label>
            <Input
              id="soyad"
              value={form.soyad}
              onChange={(e) => setForm((f) => ({ ...f, soyad: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="firma">Firma</Label>
            <Input
              id="firma"
              value={form.firma}
              onChange={(e) => setForm((f) => ({ ...f, firma: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={isSearching} className="self-end">
            {isSearching ? 'Sorgulanıyor...' : 'Sorgula'}
          </Button>
        </form>
      </div>

      {results !== null && (
        <div className="space-y-3.5">
          {canExportExcel && results.length > 0 && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleExcelExport}>
                Excel İndir
              </Button>
            </div>
          )}
          {results.length === 0 ? (
            <div className="rounded-lg border border-border bg-panel p-10 text-center text-muted-foreground">
              Bu bilgilerle eşleşen personel bulunamadı.
            </div>
          ) : (
            results.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-panel p-5">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3.5">
                  <div>
                    <h3 className="font-heading text-lg font-bold tracking-wide uppercase">
                      {p.ad} {p.soyad}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {p.tcNo ? `TC: ${p.tcNo}` : ''} {p.gorev ? `· ${p.gorev}` : ''}{' '}
                      {p.firma ? `· ${p.firma}` : ''}
                    </p>
                  </div>
                  {p.durum && <StatusTag tone={toneForDurum(p.durum)}>{p.durum}</StatusTag>}
                </div>
                {(() => {
                  const taken = p.trainings.filter((t) => t.code !== 'none');
                  if (taken.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        Bu kişinin pasaportta gösterilen eğitimlerden aldığı bulunmuyor.
                      </p>
                    );
                  }
                  return (
                    <ul className="divide-y divide-border">
                      {taken.map((t) => (
                        <li
                          key={t.trainingId}
                          className="flex items-center justify-between gap-3 py-2 text-sm"
                        >
                          <span>{t.ad}</span>
                          <span className="font-mono text-muted-foreground">
                            {fmtDate(t.tarih)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

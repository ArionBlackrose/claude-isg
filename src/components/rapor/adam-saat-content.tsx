import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fmtDate } from '@/lib/training-status';
import type { EgitimAdamSaatOzeti, EgitimOturumu } from '@/lib/adam-saat';

export function AdamSaatContent({
  rangeStart,
  rangeEnd,
  aralikToplam,
  aralikKategoriDagilimi,
  kategoriMax,
  son12Ay,
  son12AyMax,
  kategoriRollup,
  adamSaatKategoriFilter,
  onKategoriChange,
  secilenKategoriEgitimleri,
  aralikOturumlariGorunen,
}: {
  rangeStart: string;
  rangeEnd: string;
  aralikToplam: number;
  aralikKategoriDagilimi: { kategori: string; total: number }[];
  kategoriMax: number;
  son12Ay: { month: string; total: number }[];
  son12AyMax: number;
  kategoriRollup: {
    kategori: string;
    egitimSayisi: number;
    oturumSayisi: number;
    toplamKisi: number;
    toplamAdamSaat: number;
  }[];
  adamSaatKategoriFilter: string;
  onKategoriChange: (value: string) => void;
  secilenKategoriEgitimleri: EgitimAdamSaatOzeti[];
  aralikOturumlariGorunen: EgitimOturumu[];
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border border-l-3 border-l-primary bg-panel p-4">
        <div className="font-heading text-3xl leading-none font-extrabold">
          {aralikToplam.toLocaleString('tr-TR')}
        </div>
        <div className="mt-1.5 text-xs tracking-wide text-muted-foreground uppercase">
          {fmtDate(rangeStart)} — {fmtDate(rangeEnd)} Toplam Adam-Saat
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Kategoriye Göre Dağılım
        </h3>
        {!aralikKategoriDagilimi.length ? (
          <p className="text-sm text-muted-foreground">Seçili tarih aralığında kayıt yok.</p>
        ) : (
          <div className="space-y-2">
            {aralikKategoriDagilimi.map((k) => (
              <div key={k.kategori} className="flex items-center gap-2.5">
                <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                  {k.kategori}
                </span>
                <div className="h-5 flex-1 rounded bg-panel-2">
                  <div
                    className="h-5 rounded bg-primary"
                    style={{ width: `${(k.total / kategoriMax) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs">
                  {k.total.toLocaleString('tr-TR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Son 12 Ay Trend
        </h3>
        {!son12Ay.length ? (
          <p className="text-sm text-muted-foreground">Henüz veri yok.</p>
        ) : (
          <div className="space-y-2">
            {son12Ay.map((m) => {
              const inRange = m.month >= rangeStart.slice(0, 7) && m.month <= rangeEnd.slice(0, 7);
              return (
                <div key={m.month} className="flex items-center gap-2.5">
                  <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                    {m.month}
                  </span>
                  <div className="h-5 flex-1 rounded bg-panel-2">
                    <div
                      className={`h-5 rounded ${inRange ? 'bg-primary' : 'border border-primary/40'}`}
                      style={{ width: `${(m.total / son12AyMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-xs">
                    {m.total.toLocaleString('tr-TR')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Kategori Bazında Adam-Saat
          </h3>
          {adamSaatKategoriFilter !== 'all' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onKategoriChange('all')}
            >
              Tüm Kategoriler
            </Button>
          )}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Bir kategoriye tıklayınca altta o kategorideki eğitimler ayrı ayrı listelenir.
        </p>
        {!kategoriRollup.length ? (
          <p className="text-sm text-muted-foreground">Seçili tarih aralığında kayıt yok.</p>
        ) : (
          <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead>Eğitim Sayısı</TableHead>
                <TableHead>Oturum Sayısı</TableHead>
                <TableHead>Toplam Kişi</TableHead>
                <TableHead>Adam-Saat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kategoriRollup.map((k) => (
                <TableRow
                  key={k.kategori}
                  className={`cursor-pointer hover:bg-panel-2 ${adamSaatKategoriFilter === k.kategori ? 'bg-panel-2' : ''}`}
                  onClick={() =>
                    onKategoriChange(adamSaatKategoriFilter === k.kategori ? 'all' : k.kategori)
                  }
                >
                  <TableCell className="font-semibold text-primary">{k.kategori}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {k.egitimSayisi}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {k.oturumSayisi}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{k.toplamKisi}</TableCell>
                  <TableCell className="font-mono font-semibold">
                    {k.toplamAdamSaat.toLocaleString('tr-TR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {adamSaatKategoriFilter !== 'all' && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {adamSaatKategoriFilter} — Eğitim Bazında Adam-Saat
          </h3>
          {!secilenKategoriEgitimleri.length ? (
            <p className="text-sm text-muted-foreground">
              Bu kategoride seçili tarih aralığında kayıt yok.
            </p>
          ) : (
            <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Eğitim Adı</TableHead>
                  <TableHead>Oturum Sayısı</TableHead>
                  <TableHead>Toplam Kişi</TableHead>
                  <TableHead>Adam-Saat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {secilenKategoriEgitimleri.map((e) => (
                  <TableRow key={e.trainingId}>
                    <TableCell>{e.egitimAdi}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {e.oturumSayisi}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {e.toplamKisi}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {e.toplamAdamSaat.toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Seçili Aralıktaki Eğitim Oturumları
          {adamSaatKategoriFilter !== 'all' ? ` — ${adamSaatKategoriFilter}` : ''}
        </h3>
        {!aralikOturumlariGorunen.length ? (
          <p className="text-sm text-muted-foreground">Seçili aralıkta oturum yok.</p>
        ) : (
          <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Eğitim</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Kişi Sayısı</TableHead>
                <TableHead>Süre (Saat)</TableHead>
                <TableHead>Adam-Saat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aralikOturumlariGorunen.map((s, i) => (
                <TableRow key={`${s.trainingId}-${s.tarih}-${i}`}>
                  <TableCell className="font-mono text-muted-foreground">
                    {fmtDate(s.tarih)}
                  </TableCell>
                  <TableCell>{s.egitimAdi}</TableCell>
                  <TableCell className="text-muted-foreground">{s.kategori}</TableCell>
                  <TableCell className="font-mono">{s.kisiSayisi}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {s.egitimSuresi}
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{s.adamSaat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

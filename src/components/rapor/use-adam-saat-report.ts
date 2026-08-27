import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  totalAdamSaat,
  aggregateByCategory,
  aggregateByTraining,
  type EgitimOturumu,
  type EgitimAdamSaatOzeti,
} from '@/lib/adam-saat';
import { TRAINING_CATEGORIES } from '@/schemas/training';
import { downloadWorkbook, todayFileStamp } from '@/lib/excel';

/** "Adam-Saat" detay görünümünün seçili tarih aralığı + kategori filtresine
 * göre türetilen tüm verisi — görünüm (toolbar + içerik) iki ayrı bileşene
 * bölündüğü için ikisinin de aynı hesaplamayı tekrar tekrar üretmemesi
 * amacıyla tek bir hook'ta toplanır. */
export function useAdamSaatReport(
  oturumlar: EgitimOturumu[],
  aylikAdamSaat: { month: string; total: number }[],
  rangeStart: string,
  rangeEnd: string,
  adamSaatKategoriFilter: string,
) {
  const aralikOturumlari = useMemo(
    () =>
      oturumlar.filter(
        (s) => (!rangeStart || s.tarih >= rangeStart) && (!rangeEnd || s.tarih <= rangeEnd),
      ),
    [oturumlar, rangeStart, rangeEnd],
  );
  const aralikToplam = useMemo(() => totalAdamSaat(aralikOturumlari), [aralikOturumlari]);
  const aralikKategoriDagilimi = useMemo(
    () => aggregateByCategory(aralikOturumlari),
    [aralikOturumlari],
  );
  const aralikEgitimOzeti = useMemo(
    () => aggregateByTraining(aralikOturumlari),
    [aralikOturumlari],
  );
  const aralikEgitimByKategori = useMemo(() => {
    const map = new Map<string, EgitimAdamSaatOzeti[]>();
    for (const e of aralikEgitimOzeti) {
      if (!map.has(e.kategori)) map.set(e.kategori, []);
      map.get(e.kategori)!.push(e);
    }
    return map;
  }, [aralikEgitimOzeti]);

  const son12Ay = useMemo(() => aylikAdamSaat.slice(-12), [aylikAdamSaat]);
  const son12AyMax = Math.max(1, ...son12Ay.map((m) => m.total));
  const kategoriMax = Math.max(1, ...aralikKategoriDagilimi.map((k) => k.total));

  const kategoriRollup = useMemo(() => {
    const tumKategoriler = [
      ...TRAINING_CATEGORIES,
      ...Array.from(aralikEgitimByKategori.keys()),
    ].filter((k, i, arr) => arr.indexOf(k) === i);
    return tumKategoriler
      .map((kategori) => {
        const egitimler = aralikEgitimByKategori.get(kategori) ?? [];
        return {
          kategori,
          egitimSayisi: egitimler.length,
          oturumSayisi: egitimler.reduce((sum, e) => sum + e.oturumSayisi, 0),
          toplamKisi: egitimler.reduce((sum, e) => sum + e.toplamKisi, 0),
          toplamAdamSaat: egitimler.reduce((sum, e) => sum + e.toplamAdamSaat, 0),
        };
      })
      .filter((k) => k.egitimSayisi > 0)
      .sort((a, b) => b.toplamAdamSaat - a.toplamAdamSaat);
  }, [aralikEgitimByKategori]);

  const kategoriFilterOptions = useMemo(
    () => ['all', ...kategoriRollup.map((k) => k.kategori)],
    [kategoriRollup],
  );
  const secilenKategoriEgitimleri =
    adamSaatKategoriFilter !== 'all'
      ? (aralikEgitimByKategori.get(adamSaatKategoriFilter) ?? [])
      : [];
  // Seçili kategoriye göre daralan oturum listesi — "Seçili Aralıktaki Eğitim
  // Oturumları" tablosu da kategori seçimine uysun diye.
  const aralikOturumlariGorunen =
    adamSaatKategoriFilter === 'all'
      ? aralikOturumlari
      : aralikOturumlari.filter((s) => s.kategori === adamSaatKategoriFilter);

  function handleExport() {
    if (adamSaatKategoriFilter === 'all') {
      const header = ['Kategori', 'Eğitim Sayısı', 'Oturum Sayısı', 'Toplam Kişi', 'Adam-Saat'];
      const aoa: (string | number)[][] = [header];
      kategoriRollup.forEach((k) => {
        aoa.push([k.kategori, k.egitimSayisi, k.oturumSayisi, k.toplamKisi, k.toplamAdamSaat]);
      });
      aoa.push([]);
      aoa.push(['', '', '', 'Toplam', aralikToplam]);
      downloadWorkbook(
        aoa,
        'Adam-Saat',
        `adam-saat-kategori-${rangeStart}_${rangeEnd}-${todayFileStamp()}.xlsx`,
      ).catch(() => toast.error('Excel dosyası indirilemedi. Lütfen tekrar deneyin.'));
      return;
    }
    const header = ['Eğitim Adı', 'Oturum Sayısı', 'Toplam Kişi', 'Adam-Saat'];
    const aoa: (string | number)[][] = [header];
    secilenKategoriEgitimleri.forEach((e) => {
      aoa.push([e.egitimAdi, e.oturumSayisi, e.toplamKisi, e.toplamAdamSaat]);
    });
    downloadWorkbook(
      aoa,
      'Adam-Saat',
      `adam-saat-${adamSaatKategoriFilter}-${rangeStart}_${rangeEnd}-${todayFileStamp()}.xlsx`,
    ).catch(() => toast.error('Excel dosyası indirilemedi. Lütfen tekrar deneyin.'));
  }

  return {
    aralikToplam,
    aralikKategoriDagilimi,
    kategoriMax,
    son12Ay,
    son12AyMax,
    kategoriRollup,
    kategoriFilterOptions,
    secilenKategoriEgitimleri,
    aralikOturumlariGorunen,
    handleExport,
  };
}

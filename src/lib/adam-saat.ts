/** Adam-saat: bir eğitim oturumuna katılan kişi sayısı × eğitim süresi (saat) × katsayı. */
const KATSAYI = 10;

export type AdamSaatRecordLike = {
  personnelId: string;
  trainingId: string;
  tarih: string;
  sonuc: 'Başarılı' | 'Başarısız' | 'Katılmadı';
};

export type AdamSaatTrainingLike = {
  id: string;
  ad: string;
  kategori: string;
  egitimSuresi: number;
};

/** Aynı eğitime aynı tarihte katılan personel grubu — tek bir "eğitim oturumu". */
export type EgitimOturumu = {
  trainingId: string;
  egitimAdi: string;
  kategori: string;
  tarih: string;
  kisiSayisi: number;
  egitimSuresi: number;
  adamSaat: number;
};

/** Kayıtları (eğitim, tarih) çiftine göre gruplayıp her oturum için adam-saat hesaplar.
 * "Katılmadı" sonuçlu kayıtlar katılım sayılmaz. */
export function computeOturumlar(
  records: AdamSaatRecordLike[],
  trainings: AdamSaatTrainingLike[],
): EgitimOturumu[] {
  const trainingMap = new Map(trainings.map((t) => [t.id, t]));
  const groups = new Map<string, Set<string>>();
  for (const r of records) {
    if (r.sonuc === 'Katılmadı') continue;
    const key = `${r.trainingId}|${r.tarih}`;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(r.personnelId);
  }
  const sessions: EgitimOturumu[] = [];
  for (const [key, personIds] of groups) {
    const [trainingId, tarih] = key.split('|');
    const training = trainingMap.get(trainingId);
    if (!training) continue;
    const kisiSayisi = personIds.size;
    const adamSaat = kisiSayisi * training.egitimSuresi * KATSAYI;
    sessions.push({
      trainingId,
      egitimAdi: training.ad,
      kategori: training.kategori,
      tarih,
      kisiSayisi,
      egitimSuresi: training.egitimSuresi,
      adamSaat,
    });
  }
  return sessions.sort((a, b) => b.tarih.localeCompare(a.tarih));
}

export function totalAdamSaat(sessions: EgitimOturumu[]): number {
  return sessions.reduce((sum, s) => sum + s.adamSaat, 0);
}

/** "YYYY-MM-DD" -> "YYYY-MM" */
export function monthKeyOf(tarih: string): string {
  return tarih.slice(0, 7);
}

export function aggregateByMonth(sessions: EgitimOturumu[]): { month: string; total: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = monthKeyOf(s.tarih);
    map.set(k, (map.get(k) ?? 0) + s.adamSaat);
  }
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function aggregateByCategory(
  sessions: EgitimOturumu[],
): { kategori: string; total: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    map.set(s.kategori, (map.get(s.kategori) ?? 0) + s.adamSaat);
  }
  return Array.from(map.entries())
    .map(([kategori, total]) => ({ kategori, total }))
    .sort((a, b) => b.total - a.total);
}

export type EgitimAdamSaatOzeti = {
  trainingId: string;
  egitimAdi: string;
  kategori: string;
  oturumSayisi: number;
  toplamKisi: number;
  toplamAdamSaat: number;
};

/** Her eğitim türü için ayrı ayrı oturum sayısı, katılımcı ve adam-saat toplamı. */
export function aggregateByTraining(sessions: EgitimOturumu[]): EgitimAdamSaatOzeti[] {
  const map = new Map<string, EgitimAdamSaatOzeti>();
  for (const s of sessions) {
    const cur = map.get(s.trainingId) ?? {
      trainingId: s.trainingId,
      egitimAdi: s.egitimAdi,
      kategori: s.kategori,
      oturumSayisi: 0,
      toplamKisi: 0,
      toplamAdamSaat: 0,
    };
    cur.oturumSayisi += 1;
    cur.toplamKisi += s.kisiSayisi;
    cur.toplamAdamSaat += s.adamSaat;
    map.set(s.trainingId, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.toplamAdamSaat - a.toplamAdamSaat);
}

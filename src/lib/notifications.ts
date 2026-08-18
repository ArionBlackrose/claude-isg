import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { personnel, training, trainingRecord, user } from '@/db/schema';
import { statusFor, fmtDate } from '@/lib/training-status';
import { sendDigestEmail } from '@/lib/mail';

const MARKER_PATH = path.join(process.cwd(), 'data', '.last-digest-sent');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ROWS_PER_SECTION = 100;

function readLastSentAt(): number {
  try {
    const raw = fs.readFileSync(MARKER_PATH, 'utf8').trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeLastSentAt(timestamp: number) {
  fs.mkdirSync(path.dirname(MARKER_PATH), { recursive: true });
  fs.writeFileSync(MARKER_PATH, String(timestamp), 'utf8');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderSection(title: string, rows: string[]): string {
  if (!rows.length) return '';
  const items = rows
    .slice(0, MAX_ROWS_PER_SECTION)
    .map((r) => `<li>${r}</li>`)
    .join('');
  const overflow =
    rows.length > MAX_ROWS_PER_SECTION
      ? `<p style="color:#666;font-size:12px;">…ve ${rows.length - MAX_ROWS_PER_SECTION} kayıt daha. Tüm listeyi görmek için Rapor sayfasını açın.</p>`
      : '';
  return `
    <h3 style="margin-bottom:6px;">${title} (${rows.length})</h3>
    <ul style="margin-top:0;padding-left:18px;">${items}</ul>
    ${overflow}
  `;
}

/** Süresi dolmuş / yaklaşan eğitimleri hesaplayıp, tam yetkili adminlere
 * haftalık bir özet e-postası gönderir. Sadece 7 günden fazla zaman
 * geçtiyse çalışır — sunucu sık sık yeniden başlasa bile spam yapmaz. */
export async function runWeeklyExpiryDigestIfNeeded(): Promise<void> {
  const lastSentAt = readLastSentAt();
  if (Date.now() - lastSentAt < SEVEN_DAYS_MS) return;

  const [activePersonnel, trainings, records, admins] = await Promise.all([
    db.select().from(personnel).where(eq(personnel.durum, 'Güncel')),
    db.select().from(training),
    db.select().from(trainingRecord),
    db.select().from(user).where(eq(user.role, 'admin')),
  ]);

  const expired: string[] = [];
  const soon: string[] = [];

  for (const p of activePersonnel) {
    for (const t of trainings) {
      const status = statusFor(p.id, t.id, records, t);
      if (status.code !== 'expired' && status.code !== 'soon') continue;
      const label =
        status.code === 'expired'
          ? `Süresi Doldu (son alım: ${fmtDate(status.tarih)})`
          : status.label;
      const row = `<strong>${escapeHtml(p.ad)} ${escapeHtml(p.soyad)}</strong> — ${escapeHtml(t.ad)} — ${escapeHtml(label)}`;
      if (status.code === 'expired') expired.push(row);
      else soon.push(row);
    }
  }

  // Bildirilecek hiçbir şey yoksa e-posta gönderilmez, ama işaretleyici
  // yine de güncellenir — aksi halde her saatlik kontrolde tekrar tekrar
  // "boş" kontrol yapılır (zararsız ama gereksiz).
  writeLastSentAt(Date.now());
  if (!expired.length && !soon.length) return;

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="letter-spacing:0.3px;">İSG-Ç Eğitim Takip Sistemi — Haftalık Eğitim Durumu Özeti</h2>
      <p style="color:#666;font-size:13px;">Bu özet, süresi dolmuş veya 30 gün içinde dolacak eğitimleri listeler.</p>
      ${renderSection('Süresi Dolan Eğitimler', expired)}
      ${renderSection('Süresi Yaklaşan Eğitimler (30 gün)', soon)}
    </div>
  `;

  await sendDigestEmail(
    admins.map((a) => a.email),
    `Eğitim Durumu Özeti — ${expired.length} süresi dolmuş, ${soon.length} yaklaşan`,
    html,
  );
}

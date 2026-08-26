import { Resend } from 'resend';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

type DevOtp = { otp: string; issuedAt: number };
const devOtpByEmail = new Map<string, DevOtp>();
const DEV_OTP_TTL_MS = 5 * 60 * 1000;

/** Resend yapılandırılmamışken en son üretilen kodu döndürür — login ekranındaki
 * test toast'ı bunu okur. Gerçek e-posta yapılandırıldığında hiçbir zaman dolmaz. */
export function getDevOtp(email: string): string | null {
  if (isEmailConfigured()) return null;
  const entry = devOtpByEmail.get(email);
  if (!entry || Date.now() - entry.issuedAt > DEV_OTP_TTL_MS) return null;
  return entry.otp;
}

/** Resend yapılandırılmamışsa (geliştirme/kurulum sürecinde) e-postayı
 * göndermek yerine sunucu logunda gösterir — hem giriş akışı hem de
 * bildirimler Resend olmadan da test edilebilir. */
async function sendMail(to: string | string[], subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(
      `[mail] RESEND_API_KEY/RESEND_FROM_EMAIL tanımlı değil. "${subject}" e-postası ${Array.isArray(to) ? to.join(', ') : to} adresine gönderilemedi (log'a yazıldı).`,
    );
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`E-posta gönderilemedi: ${error.message}`);
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!isEmailConfigured()) {
    // Resend yapılandırılmamış — geliştirme/kurulum sürecinde kodu sunucu
    // logunda gösteriyoruz (ve login ekranındaki test toast'ı okuyabilsin
    // diye bellekte tutuyoruz) ki giriş akışı Resend olmadan da test
    // edilebilsin.
    devOtpByEmail.set(email, { otp, issuedAt: Date.now() });
    console.warn(
      `[mail] RESEND_API_KEY/RESEND_FROM_EMAIL tanımlı değil. ${email} için giriş kodu: ${otp}`,
    );
    return;
  }

  await sendMail(
    email,
    `Giriş Kodunuz: ${otp}`,
    `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;">
        <h2 style="letter-spacing:0.3px;">İSG-Ç Takip Sistemi</h2>
        <p>Giriş kodunuz:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:6px;">${otp}</p>
        <p style="color:#666;font-size:13px;">Bu kod 5 dakika içinde geçerliliğini yitirir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
      </div>
    `,
  );
}

export async function sendDigestEmail(to: string[], subject: string, html: string): Promise<void> {
  if (!to.length) return;
  await sendMail(to, subject, html);
}

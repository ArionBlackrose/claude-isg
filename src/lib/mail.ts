import { Resend } from 'resend';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!isEmailConfigured()) {
    // Resend yapılandırılmamış — geliştirme/kurulum sürecinde kodu sunucu
    // logunda gösteriyoruz ki giriş akışı Resend olmadan da test edilebilsin.
    console.warn(
      `[mail] RESEND_API_KEY/RESEND_FROM_EMAIL tanımlı değil. ${email} için giriş kodu: ${otp}`,
    );
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: email,
    subject: `Giriş Kodunuz: ${otp}`,
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;">
        <h2 style="letter-spacing:0.3px;">İSG-Ç Eğitim Takip Sistemi</h2>
        <p>Giriş kodunuz:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:6px;">${otp}</p>
        <p style="color:#666;font-size:13px;">Bu kod 5 dakika içinde geçerliliğini yitirir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`E-posta gönderilemedi: ${error.message}`);
  }
}

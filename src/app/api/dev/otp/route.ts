import { NextRequest, NextResponse } from 'next/server';
import { getDevOtp } from '@/lib/mail';

/** Sadece Resend yapılandırılmamışken (bkz. lib/mail.ts) yanıt döner — gerçek
 * e-posta gönderimi etkinleştirildiğinde bu uç nokta her zaman null döndürür.
 * Ek olarak NODE_ENV === 'production' burada da açıkça reddedilir: RESEND_API_KEY
 * canlıda yanlışlıkla boş bırakılırsa bile bu uç nokta bir OTP oracle'ına
 * dönüşmesin — getDevOtp'nin örtük davranışına tek başına güvenilmez. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ otp: null }, { status: 404 });
  }
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ otp: null }, { status: 400 });
  }
  return NextResponse.json({ otp: getDevOtp(email) });
}

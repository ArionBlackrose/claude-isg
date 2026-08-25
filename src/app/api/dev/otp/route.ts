import { NextRequest, NextResponse } from 'next/server';
import { getDevOtp } from '@/lib/mail';

/** Sadece Resend yapılandırılmamışken (bkz. lib/mail.ts) yanıt döner — gerçek
 * e-posta gönderimi etkinleştirildiğinde bu uç nokta her zaman null döndürür. */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ otp: null }, { status: 400 });
  }
  return NextResponse.json({ otp: getDevOtp(email) });
}

import { NextResponse, type NextRequest } from 'next/server';
import { isNativeIosUserAgent, nativeRedirectFor } from '@/lib/native/platform';

/**
 * App Store build only: skip the marketing pages (which advertise web Stripe checkout and the
 * founding-pilot coupon) and send the app straight into the product or the StoreKit paywall.
 * Browsers are never redirected; the matcher keeps every other route untouched.
 */
export function proxy(request: NextRequest) {
  if (!isNativeIosUserAgent(request.headers.get('user-agent'))) return NextResponse.next();
  const target = nativeRedirectFor(request.nextUrl.pathname);
  if (!target) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url));
}

export const config = {
  matcher: ['/', '/pricing', '/welcome'],
};

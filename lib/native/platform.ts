/**
 * Detects the App Store build (Capacitor 8 iOS shell, see capacitor.config.ts).
 *
 * Two signals, both set only by the native app:
 * - the WebView user agent ends with `InvoiceLabIOS/<version>` (`appendUserAgent`), readable on the
 *   server (proxy.ts) and before hydration (NATIVE_FLAG_SCRIPT), and
 * - the Capacitor bridge reports the `ios` platform at runtime.
 * Regular browsers, the installed PWA and Vercel previews never match, so web behaviour
 * (Stripe checkout, ALFOUNDING, Add to Home Screen) is unchanged.
 */
export const NATIVE_UA_TOKEN = 'InvoiceLabIOS';
export const NATIVE_HTML_ATTR = 'data-native';

export function isNativeIosUserAgent(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && new RegExp(`\\b${NATIVE_UA_TOKEN}/\\d`).test(userAgent));
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

/** True only inside the Invoice Jot iOS app. Safe to call during SSR (returns false). */
export function isNativeIos(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.() && cap.getPlatform?.() === 'ios') return true;
  return isNativeIosUserAgent(navigator.userAgent);
}

/** Runs in <head> before paint so web-only purchase UI never flashes inside the app. */
export const NATIVE_FLAG_SCRIPT = `try{if(/\\b${NATIVE_UA_TOKEN}\\/\\d/.test(navigator.userAgent)){document.documentElement.setAttribute('${NATIVE_HTML_ATTR}','ios')}}catch(e){}`;

/** Marketing and web-checkout pages that the App Store build never shows (proxy.ts). */
export function nativeRedirectFor(pathname: string): string | null {
  if (pathname === '/' || pathname === '/welcome') return '/dashboard';
  if (pathname === '/pricing') return '/ios/upgrade';
  return null;
}

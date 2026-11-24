/**
 * invoicelab:// deep links (registered in ios/App/App/Info.plist CFBundleURLTypes).
 *   invoicelab://invoices/<id>      -> /invoices/<id>
 *   invoicelab://estimates/new      -> /estimates/new
 *   invoicelab:///dashboard         -> /dashboard
 * Links to the production site (https://invoice-payments-two.vercel.app/...) map the same way.
 * Anything outside the signed-in app falls back to the dashboard.
 */
export const DEEP_LINK_SCHEME = 'invoicelab';
export const APP_ORIGIN = 'https://invoice-payments-two.vercel.app';

const ALLOWED_ROOTS = new Set([
  'dashboard', 'invoices', 'estimates', 'jobs', 'clients', 'payments', 'reminders', 'reports',
  'studio', 'settings', 'price-book', 'templates', 'ios', 'login',
]);

export function deepLinkToPath(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  let path: string;
  if (url.protocol === `${DEEP_LINK_SCHEME}:`) {
    // invoicelab://invoices/abc parses with host "invoices"; invoicelab:///invoices/abc has an empty host.
    path = `/${[url.hostname, url.pathname.replace(/^\/+/, '')].filter(Boolean).join('/')}`;
  } else if (url.origin === APP_ORIGIN) {
    path = url.pathname || '/';
  } else {
    return null;
  }
  path = path.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
  const root = path.split('/')[1] ?? '';
  if (!ALLOWED_ROOTS.has(root) || path.includes('..')) return '/dashboard';
  return `${path}${url.search}`;
}

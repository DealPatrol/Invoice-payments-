import { describe, expect, it } from 'vitest';
import { isNativeIosUserAgent, nativeRedirectFor } from '@/lib/native/platform';
import { deepLinkToPath } from '@/lib/native/deep-links';
import { planInvoiceReminders, reminderId } from '@/lib/native/reminders';
import { draftToInvoiceInput, toCachedClients, toCachedInvoices } from '@/lib/native/offline-cache';
import { shouldShowIosInstallHint } from '@/lib/pwa';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const APP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 InvoiceLabIOS/1.0';

describe('native iOS detection', () => {
  it('only matches the App Store build user agent', () => {
    expect(isNativeIosUserAgent(APP)).toBe(true);
    expect(isNativeIosUserAgent(SAFARI)).toBe(false);
    expect(isNativeIosUserAgent('')).toBe(false);
    expect(isNativeIosUserAgent(null)).toBe(false);
  });

  it('redirects marketing / web-checkout pages inside the app only', () => {
    expect(nativeRedirectFor('/')).toBe('/dashboard');
    expect(nativeRedirectFor('/welcome')).toBe('/dashboard');
    expect(nativeRedirectFor('/pricing')).toBe('/ios/upgrade');
    expect(nativeRedirectFor('/invoices')).toBeNull();
    expect(nativeRedirectFor('/pay/abc')).toBeNull();
  });
});

describe('Add to Home Screen hint', () => {
  const base = { standalone: false, displayModeStandalone: false, dismissed: false, maxTouchPoints: 5, platform: 'iPhone', pathname: '/dashboard' };
  it('still shows in iPhone Safari (web unchanged)', () => {
    expect(shouldShowIosInstallHint({ ...base, userAgent: SAFARI })).toBe(true);
  });
  it('never shows inside the native app', () => {
    expect(shouldShowIosInstallHint({ ...base, userAgent: APP })).toBe(false);
  });
});

describe('deepLinkToPath', () => {
  it('maps invoicelab:// links into app routes', () => {
    expect(deepLinkToPath('invoicelab://invoices/abc123')).toBe('/invoices/abc123');
    expect(deepLinkToPath('invoicelab:///estimates/new')).toBe('/estimates/new');
    expect(deepLinkToPath('invoicelab://dashboard?tab=1')).toBe('/dashboard?tab=1');
    expect(deepLinkToPath('https://invoice-payments-two.vercel.app/jobs/9')).toBe('/jobs/9');
  });
  it('falls back to the dashboard for unknown routes and ignores foreign origins', () => {
    expect(deepLinkToPath('invoicelab://api/account')).toBe('/dashboard');
    expect(deepLinkToPath('invoicelab://pricing')).toBe('/dashboard');
    expect(deepLinkToPath('https://evil.example/invoices/1')).toBeNull();
    expect(deepLinkToPath('not a url')).toBeNull();
  });
});

describe('planInvoiceReminders', () => {
  const now = new Date(2026, 10, 23, 15, 0, 0); // local time, 3 PM
  const invoices = [
    { id: 'a', invoiceNumber: 'INV-1', clientName: 'Acme', status: 'sent', dueDate: new Date(2026, 10, 18).toISOString() },
    { id: 'b', invoiceNumber: 'INV-2', status: 'sent', dueDate: new Date(2026, 10, 26).toISOString() },
    { id: 'c', invoiceNumber: 'INV-3', status: 'paid', dueDate: new Date(2026, 10, 1).toISOString() },
    { id: 'd', invoiceNumber: 'INV-4', status: 'sent', dueDate: new Date(2027, 0, 30).toISOString() },
    { id: 'e', invoiceNumber: 'INV-5', status: 'draft', dueDate: new Date(2026, 10, 1).toISOString() },
  ];
  const plan = planInvoiceReminders(invoices, now);

  it('reminds about overdue and soon-due unpaid invoices only', () => {
    expect(plan.map((p) => p.path)).toEqual(['/invoices/a', '/invoices/b']);
  });
  it('schedules overdue nudges for the next 9 AM and due-date nudges at 9 AM on the day', () => {
    expect(plan[0].at).toEqual(new Date(2026, 10, 24, 9, 0, 0));
    expect(plan[0].body).toContain('5 days past due for Acme');
    expect(plan[1].at).toEqual(new Date(2026, 10, 26, 9, 0, 0));
  });
  it('never puts amounts on the lock screen and uses stable ids', () => {
    for (const p of plan) expect(`${p.title} ${p.body}`).not.toMatch(/\$|\d+\.\d{2}/);
    expect(reminderId('a', 'overdue')).toBe(reminderId('a', 'overdue'));
    expect(reminderId('a', 'overdue')).not.toBe(reminderId('a', 'due'));
    expect(reminderId('a', 'overdue')).toBeGreaterThan(0);
  });
});

describe('offline cache', () => {
  it('keeps only the fields the offline page needs', () => {
    const [inv] = toCachedInvoices([{ id: 'x', invoiceNumber: 'INV-9', clientName: 'Bo', clientEmail: 'b@x.co', status: 'sent', dueDate: '2026-12-01', total: 120.5, currency: 'USD', items: [{}], payToken: 'secret' }]);
    expect(inv).toEqual({ id: 'x', invoiceNumber: 'INV-9', clientName: 'Bo', clientEmail: 'b@x.co', status: 'sent', dueDate: '2026-12-01', total: 120.5, currency: 'USD' });
    expect(toCachedInvoices(null)).toEqual([]);
    expect(toCachedClients([{ id: '1', name: 'Bo', email: 'b@x.co', taxId: 'T' }])).toEqual([{ id: '1', name: 'Bo', email: 'b@x.co', phone: null, currency: 'USD' }]);
  });

  it('turns an offline draft into the same body the web invoice form posts', () => {
    const body = draftToInvoiceInput({
      id: 'd1', createdAt: '2026-11-23', clientName: ' Bo ', clientEmail: 'b@x.co', currency: 'usd', dueDate: '2026-12-07', notes: '',
      items: [{ description: 'Labor', quantity: 2, unitRate: 85 }, { description: ' ', quantity: 1, unitRate: 5 }],
    });
    expect(body).toEqual({ clientName: 'Bo', clientEmail: 'b@x.co', country: 'US', currency: 'USD', dueDate: '2026-12-07', notes: undefined, taxRate: 0, items: [{ description: 'Labor', quantity: 2, unitRate: 85 }] });
  });
});

/**
 * "Get paid with card" (Stripe Connect) — the iPhone side.
 *
 * Invoice Jot stays local-first and login-free. The only things this feature keeps on the phone are
 * the connected Stripe account id and its key (in iOS UserDefaults via Capacitor Preferences). The
 * "Pay online" link is saved as the invoice's normal payment link, so it prints on the PDF like any
 * pasted link. Only the Stripe steps need a connection; everything else keeps working offline.
 *
 * What is sent to invoicejot.com (and on to Stripe): country + currency when connecting; the
 * invoice amount, currency, invoice number and a random reference when making a pay link; the
 * account id/key when checking status. Never client names, emails, addresses or line items.
 */
import { Preferences } from '@capacitor/preferences';
import { SITE_URL } from './config';
import type { Database, Doc } from './types';
import { docTotals } from './calc';
import { recordPayment } from './db';

export const CARD_METHOD = 'Card (Stripe)';
const KEY = 'invoicejot:card-payments';

export type CardState = 'needs_onboarding' | 'pending' | 'active' | 'restricted';

export interface CardConnection {
  accountId: string;
  accountKey: string;
  country: string;
  state: CardState | 'unknown';
  feeLabel: string;
  checkedAt: string | null;
}

export async function loadConnection(): Promise<CardConnection | null> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    const o = JSON.parse(value) as Partial<CardConnection>;
    if (typeof o.accountId !== 'string' || typeof o.accountKey !== 'string') return null;
    return { accountId: o.accountId, accountKey: o.accountKey, country: o.country ?? 'us', state: o.state ?? 'unknown', feeLabel: o.feeLabel ?? '1%', checkedAt: o.checkedAt ?? null };
  } catch {
    return null;
  }
}

export async function saveConnection(c: CardConnection): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(c) });
}

/** Forgets the connection on this iPhone. The Stripe account itself belongs to the user and stays theirs. */
export async function clearConnection(): Promise<void> {
  await Preferences.remove({ key: KEY });
}

/* ---------------- pure helpers (unit-tested) ---------------- */

const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

export function toMinor(amount: number, currency: string): number {
  const f = ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
  return Math.round(Number((amount * f).toFixed(6)));
}

export function fromMinor(minor: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? minor : minor / 100;
}

const PAY_PREFIX = `${SITE_URL}/pay-online/`;

/** Returns the token if `url` is an Invoice Jot card-payment link, else null. */
export function cardLinkToken(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(PAY_PREFIX)) return null;
  const t = url.slice(PAY_PREFIX.length);
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{32}$/.test(t) ? t : null;
}

export interface PayLinkInfo {
  accountId: string;
  amountMinor: number;
  currency: string;
  invoiceNumber: string;
  ref: string;
  issuedAt: number;
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Reads (does not verify) what a pay link was made for. The server verifies the signature. */
export function readPayLink(url: string | null | undefined): PayLinkInfo | null {
  const t = cardLinkToken(url);
  if (!t) return null;
  try {
    const p = JSON.parse(b64urlDecode(t.split('.')[0])) as { a: string; m: number; c: string; n: string; r: string; i: number };
    return { accountId: p.a, amountMinor: p.m, currency: p.c, invoiceNumber: p.n, ref: p.r, issuedAt: p.i };
  } catch {
    return null;
  }
}

/** Is the card link on this invoice still for the current balance (and this Stripe connection)? */
export function cardLinkIsCurrent(doc: Doc, currency: string, conn: Pick<CardConnection, 'accountId'> | null): boolean {
  const info = readPayLink(doc.paymentLink);
  if (!info) return false;
  if (conn && info.accountId !== conn.accountId) return false;
  const balanceMinor = toMinor(docTotals(doc).balance + cardPaidOn(doc), currency);
  return info.currency === currency.toUpperCase() && info.amountMinor === balanceMinor;
}

/** Card payments already recorded on this invoice by "Check payment". */
export function cardPaidOn(doc: Doc): number {
  return Math.round(doc.payments.filter((p) => p.method === CARD_METHOD).reduce((s, p) => s + p.amount, 0) * 100) / 100;
}

export function newPaymentRef(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `ij_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Records whatever Stripe says was paid by card that is not yet on the invoice. Idempotent: running
 * "Check payment" twice never double-counts.
 */
export function applyCardStatus(db: Database, docId: string, amountPaid: number, paidAt: string | null): { db: Database; added: number; fullyPaid: boolean } {
  const doc = db.docs.find((d) => d.id === docId);
  if (!doc) return { db, added: 0, fullyPaid: false };
  const missing = Math.round((amountPaid - cardPaidOn(doc)) * 100) / 100;
  if (missing <= 0) return { db, added: 0, fullyPaid: doc.status === 'paid' };
  const amount = Math.min(missing, docTotals(doc).balance);
  if (amount <= 0) return { db, added: 0, fullyPaid: doc.status === 'paid' };
  const date = (paidAt ?? new Date().toISOString()).slice(0, 10);
  const r = recordPayment(db, docId, amount, CARD_METHOD, date);
  return { db: r.db, added: amount, fullyPaid: r.fullyPaid };
}

/* ---------------- API client ---------------- */

export class CardApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function cardApi(fetchImpl: FetchLike = (i, init) => fetch(i, init), base = SITE_URL) {
  async function call<T>(path: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {
      throw new CardApiError('You appear to be offline. Card payments need an internet connection; everything else works offline.', 'offline', 0);
    }
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    if (!res.ok) throw new CardApiError(typeof json.error === 'string' ? json.error : `Request failed (${res.status}).`, typeof json.code === 'string' ? json.code : 'error', res.status);
    return json as T;
  }
  return {
    createAccount: (country: string, currency: string) => call<{ accountId: string; accountKey: string; onboardingUrl: string }>('/api/connect/accounts', { country, currency }),
    onboardingLink: (c: Pick<CardConnection, 'accountId' | 'accountKey'>) => call<{ url: string }>('/api/connect/onboarding-link', { accountId: c.accountId, accountKey: c.accountKey }),
    status: (c: Pick<CardConnection, 'accountId' | 'accountKey'>) =>
      call<{ state: CardState; cardPayments: string; requirementsDue: number; displayName: string | null; feeLabel: string }>('/api/connect/status', { accountId: c.accountId, accountKey: c.accountKey }),
    payLink: (c: Pick<CardConnection, 'accountId' | 'accountKey'>, p: { amount: number; currency: string; invoiceNumber: string; ref: string }) =>
      call<{ url: string; token: string; amountMinor: number; currency: string; feeMinor: number }>('/api/connect/pay-links', { accountId: c.accountId, accountKey: c.accountKey, ...p }),
    invoiceStatus: (c: Pick<CardConnection, 'accountId' | 'accountKey'>, token: string) =>
      call<{ paid: boolean; amountPaid: number; currency: string; paidAt: string | null; processing: boolean }>('/api/connect/invoice-status', { accountId: c.accountId, accountKey: c.accountKey, token }),
  };
}

export const CARD_COUNTRIES: { code: string; name: string }[] = [
  { code: 'us', name: 'United States' },
  { code: 'ca', name: 'Canada' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'au', name: 'Australia' },
  { code: 'nz', name: 'New Zealand' },
  { code: 'ie', name: 'Ireland' },
];

export const STATE_LABEL: Record<CardConnection['state'], string> = {
  active: 'Ready: clients can pay by card',
  pending: 'Stripe is reviewing your details',
  needs_onboarding: 'Finish setting up with Stripe',
  restricted: 'Stripe needs more information',
  unknown: 'Tap Check status',
};

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stateless auth for "Get paid with card". The server keeps no database:
 *  - accountKey = HMAC(secret, "acct:" + acct_id). Returned once when the app creates the connected
 *    account and stored only on the phone. Required for onboarding links, status and new pay links,
 *    so knowing an acct_ id alone (it appears inside pay links) is not enough to manage the account.
 *  - pay token = base64url(JSON payload) + "." + HMAC(secret, "pay:" + payload). Printed on the
 *    invoice/PDF as https://invoicejot.com/pay-online/<token>. The amount cannot be changed without
 *    breaking the signature. The payload holds only: account id, amount, currency, invoice number,
 *    a random reference and the issue time — no client name, email or address.
 */

export interface PayPayload {
  v: 1;
  /** Connected account id (acct_...). */
  a: string;
  /** Amount in minor units. */
  m: number;
  /** ISO currency, upper case. */
  c: string;
  /** Invoice number shown on Checkout, e.g. INV-0042. */
  n: string;
  /** Random reference generated on the phone; ties Stripe payments back to this invoice. */
  r: string;
  /** Issued at, unix seconds. */
  i: number;
}

const ACCT_RE = /^acct_[A-Za-z0-9]{6,64}$/;
const REF_RE = /^[A-Za-z0-9_-]{8,64}$/;
const INV_RE = /^[\p{L}\p{N} #._\/-]{1,40}$/u;

export function isAccountId(v: unknown): v is string {
  return typeof v === 'string' && ACCT_RE.test(v);
}
export function isRef(v: unknown): v is string {
  return typeof v === 'string' && REF_RE.test(v);
}
export function isInvoiceNumber(v: unknown): v is string {
  return typeof v === 'string' && INV_RE.test(v);
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function mac(secret: string, msg: string): Buffer {
  return createHmac('sha256', secret).update(msg).digest();
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function accountKeyFor(secret: string, accountId: string): string {
  return b64url(mac(secret, `acct:${accountId}`));
}

export function verifyAccountKey(secret: string, accountId: unknown, key: unknown): accountId is string {
  if (!isAccountId(accountId) || typeof key !== 'string' || key.length < 20 || key.length > 100) return false;
  return safeEqual(accountKeyFor(secret, accountId), key);
}

export function signPayToken(secret: string, p: PayPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(p), 'utf8'));
  const sig = b64url(mac(secret, `pay:${body}`)).slice(0, 32);
  return `${body}.${sig}`;
}

export function verifyPayToken(secret: string, token: unknown): PayPayload | null {
  if (typeof token !== 'string' || token.length > 1200) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]{32}$/.test(sig)) return null;
  if (!safeEqual(b64url(mac(secret, `pay:${body}`)).slice(0, 32), sig)) return null;
  let p: unknown;
  try {
    p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const o = p as Partial<PayPayload>;
  if (o.v !== 1 || !isAccountId(o.a) || !isRef(o.r) || !isInvoiceNumber(o.n)) return null;
  if (typeof o.m !== 'number' || !Number.isInteger(o.m) || o.m <= 0) return null;
  if (typeof o.c !== 'string' || !/^[A-Z]{3}$/.test(o.c) || typeof o.i !== 'number') return null;
  return o as PayPayload;
}

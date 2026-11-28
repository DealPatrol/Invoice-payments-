import type Stripe from 'stripe';
import type { ConnectConfig } from './config';
import { applicationFee, fromMinorUnits, normalizeCurrency, toMinorUnits, validMinorAmount } from './money';
import { accountKeyFor, isInvoiceNumber, isRef, signPayToken, verifyAccountKey, verifyPayToken, type PayPayload } from './tokens';

/**
 * Invoice Jot "Get paid with card" — Stripe Connect, stateless.
 *
 * Configuration (Accounts v2): each Invoice Jot user gets their OWN Stripe account
 *   dashboard: "full", fees_collector: "stripe", losses_collector: "stripe",
 *   configuration.merchant with card_payments requested.
 * Charges are DIRECT charges on that account (the user is merchant of record for their own
 * real-world work), created as hosted Checkout Sessions with an application fee of
 * INVOICEJOT_PLATFORM_FEE_BPS (default 100 = 1%). Stripe bills its processing fee to the user's
 * account; Invoice Jot only receives the application fee.
 *
 * Nothing is stored on our server. Paid status lives in Stripe (PaymentIntent metadata
 * `invoicejot_ref`) and is read back live when the app taps "Check payment".
 */

export class ConnectError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'bad_request',
  ) {
    super(message);
    this.name = 'ConnectError';
  }
}

export const SUPPORTED_COUNTRIES = ['us', 'ca', 'gb', 'au', 'nz', 'ie'] as const;

export type ConnectAccountState = 'needs_onboarding' | 'pending' | 'active' | 'restricted';

export interface ConnectAccountStatus {
  accountId: string;
  state: ConnectAccountState;
  cardPayments: string;
  /** Number of things Stripe is waiting on the user to provide. */
  requirementsDue: number;
  displayName: string | null;
  defaultCurrency: string | null;
}

/** Minimal Stripe surface we use, so tests can pass a mock. */
export type StripeLike = Pick<Stripe, 'checkout' | 'paymentIntents' | 'webhooks'> & {
  v2: { core: { accounts: Pick<Stripe['v2']['core']['accounts'], 'create' | 'retrieve'>; accountLinks: Pick<Stripe['v2']['core']['accountLinks'], 'create'> } };
};

const INCLUDE = ['configuration.merchant', 'requirements', 'defaults'] as const;

function deepLink(path: string): string {
  return `invoicejot://${path}`;
}

export function returnUrls(cfg: ConnectConfig) {
  return {
    returnUrl: `${cfg.siteUrl}/connect/return`,
    refreshUrl: `${cfg.siteUrl}/connect/refresh`,
    appReturn: deepLink('stripe/return'),
  };
}

export async function createConnectedAccount(stripe: StripeLike, cfg: ConnectConfig, input: { country?: unknown; currency?: unknown }) {
  const country = typeof input.country === 'string' ? input.country.toLowerCase() : 'us';
  if (!(SUPPORTED_COUNTRIES as readonly string[]).includes(country)) throw new ConnectError('That country is not supported for card payments in Invoice Jot yet.');
  const currency = normalizeCurrency(input.currency);
  const account = await stripe.v2.core.accounts.create({
    dashboard: 'full',
    identity: { country },
    defaults: {
      ...(currency ? { currency: currency.toLowerCase() } : {}),
      responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
    },
    configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
    metadata: { source: 'invoicejot_ios' },
    include: [...INCLUDE],
  });
  const link = await onboardingLink(stripe, cfg, account.id);
  return { accountId: account.id, accountKey: accountKeyFor(cfg.linkSecret, account.id), onboardingUrl: link };
}

export async function onboardingLink(stripe: StripeLike, cfg: ConnectConfig, accountId: string): Promise<string> {
  const { returnUrl, refreshUrl } = returnUrls(cfg);
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: { type: 'account_onboarding', account_onboarding: { configurations: ['merchant'], return_url: returnUrl, refresh_url: refreshUrl } },
  });
  return link.url;
}

export function requireAccount(cfg: ConnectConfig, body: { accountId?: unknown; accountKey?: unknown }): string {
  if (!verifyAccountKey(cfg.linkSecret, body.accountId, body.accountKey)) throw new ConnectError('This card-payments connection is not recognised. Disconnect and set it up again.', 401, 'bad_account_key');
  return body.accountId as string;
}

type V2Account = Stripe.V2.Core.Account;

export function summarizeAccount(account: V2Account): ConnectAccountStatus {
  const card = account.configuration?.merchant?.capabilities?.card_payments?.status ?? 'unrequested';
  const entries = account.requirements?.entries ?? [];
  const due = entries.filter((e) => e.awaiting_action_from === 'user' && ['currently_due', 'past_due'].includes(String(e.minimum_deadline?.status))).length;
  let state: ConnectAccountState;
  if (card === 'active') state = 'active';
  else if (due > 0) state = 'needs_onboarding';
  else if (card === 'pending') state = 'pending';
  else state = 'restricted';
  return {
    accountId: account.id,
    state,
    cardPayments: card,
    requirementsDue: due,
    displayName: account.display_name ?? null,
    defaultCurrency: account.defaults?.currency ? account.defaults.currency.toUpperCase() : null,
  };
}

export async function accountStatus(stripe: StripeLike, accountId: string): Promise<ConnectAccountStatus> {
  const account = await stripe.v2.core.accounts.retrieve(accountId, { include: [...INCLUDE] });
  return summarizeAccount(account);
}

export interface PayLinkInput {
  amount?: unknown;
  currency?: unknown;
  invoiceNumber?: unknown;
  ref?: unknown;
}

/** Signs a durable pay link. No Stripe call: the Checkout Session is created only when the client taps it. */
export function createPayLink(cfg: ConnectConfig, accountId: string, input: PayLinkInput, now = Date.now()) {
  const currency = normalizeCurrency(input.currency);
  if (!currency) throw new ConnectError('Unsupported currency.');
  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount)) throw new ConnectError('Amount is required.');
  const minor = toMinorUnits(input.amount, currency);
  if (!validMinorAmount(minor)) throw new ConnectError('Card payments need an amount of at least 0.50 and below 1,000,000.');
  if (!isInvoiceNumber(input.invoiceNumber)) throw new ConnectError('Invoice number is missing or has unsupported characters.');
  if (!isRef(input.ref)) throw new ConnectError('Invalid invoice reference.');
  const payload: PayPayload = { v: 1, a: accountId, m: minor, c: currency, n: input.invoiceNumber, r: input.ref, i: Math.floor(now / 1000) };
  const token = signPayToken(cfg.linkSecret, payload);
  return { token, url: `${cfg.siteUrl}/pay-online/${token}`, amountMinor: minor, currency, feeMinor: applicationFee(minor, cfg.feeBps) };
}

export interface InvoicePaymentStatus {
  paid: boolean;
  /** Total succeeded card payments for this invoice reference, in major units. */
  amountPaid: number;
  amountMinorPaid: number;
  currency: string;
  /** ISO date of the latest successful payment. */
  paidAt: string | null;
  /** Payment is processing (e.g. a delayed method); not counted as paid yet. */
  processing: boolean;
  payments: { id: string; amount: number; created: string }[];
}

/** Reads paid status live from Stripe (the source of truth). Uses a time-bounded list, so it is immediately consistent. */
export async function invoiceStatus(stripe: StripeLike, p: { accountId: string; ref: string; currency: string; since: number; expectedMinor?: number }): Promise<InvoicePaymentStatus> {
  const succeeded: Stripe.PaymentIntent[] = [];
  let processing = false;
  let seen = 0;
  const list = stripe.paymentIntents.list({ created: { gte: Math.max(0, p.since - 300) }, limit: 100 }, { stripeAccount: p.accountId });
  for await (const pi of list) {
    if (++seen > 1000) break;
    if (pi.metadata?.invoicejot_ref !== p.ref) continue;
    if (pi.status === 'succeeded') succeeded.push(pi);
    else if (pi.status === 'processing') processing = true;
  }
  const amountMinorPaid = succeeded.reduce((s, pi) => s + (pi.amount_received || pi.amount || 0), 0);
  const latest = succeeded.reduce((m, pi) => Math.max(m, pi.created), 0);
  const currency = (succeeded[0]?.currency ?? p.currency).toUpperCase();
  return {
    paid: amountMinorPaid > 0 && (p.expectedMinor == null || amountMinorPaid >= p.expectedMinor),
    amountMinorPaid,
    amountPaid: fromMinorUnits(amountMinorPaid, currency),
    currency,
    paidAt: latest ? new Date(latest * 1000).toISOString() : null,
    processing,
    payments: succeeded.map((pi) => ({ id: pi.id, amount: fromMinorUnits(pi.amount_received || pi.amount, currency), created: new Date(pi.created * 1000).toISOString() })),
  };
}

export type CheckoutStart = { kind: 'redirect'; url: string } | { kind: 'paid' } | { kind: 'unavailable'; code: 'invalid' | 'not_ready' | 'error'; reason: string };

/** Called when the client opens the pay link. Creates a hosted Checkout Session (direct charge) on the user's account. */
export async function startCheckout(stripe: StripeLike, cfg: ConnectConfig, token: string): Promise<CheckoutStart> {
  const p = verifyPayToken(cfg.linkSecret, token);
  if (!p) return { kind: 'unavailable', code: 'invalid', reason: 'This payment link is not valid. Ask for a new invoice.' };
  let status: ConnectAccountStatus;
  try {
    status = await accountStatus(stripe, p.a);
  } catch {
    return { kind: 'unavailable', code: 'error', reason: 'Online card payment is not available for this invoice right now.' };
  }
  if (status.state !== 'active') return { kind: 'unavailable', code: 'not_ready', reason: 'This business has not finished setting up card payments yet. Please use the other payment options on the invoice.' };
  const already = await invoiceStatus(stripe, { accountId: p.a, ref: p.r, currency: p.c, since: p.i, expectedMinor: p.m });
  if (already.paid) return { kind: 'paid' };
  const remaining = p.m - already.amountMinorPaid;
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: p.c.toLowerCase(), unit_amount: remaining, product_data: { name: `Invoice ${p.n}` } } }],
      client_reference_id: p.r,
      metadata: { invoicejot_ref: p.r, invoicejot_invoice: p.n },
      payment_intent_data: {
        application_fee_amount: applicationFee(remaining, cfg.feeBps),
        description: `Invoice ${p.n}`,
        metadata: { invoicejot_ref: p.r, invoicejot_invoice: p.n },
      },
      success_url: `${cfg.siteUrl}/paid?status=success&invoice=${encodeURIComponent(p.n)}`,
      cancel_url: `${cfg.siteUrl}/paid?status=cancelled&invoice=${encodeURIComponent(p.n)}&t=${encodeURIComponent(token)}`,
    },
    { stripeAccount: p.a },
  );
  if (!session.url) throw new ConnectError('Stripe did not return a checkout page.', 502, 'no_checkout_url');
  return { kind: 'redirect', url: session.url };
}

const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
const FAILED_EVENTS = new Set(['checkout.session.async_payment_failed']);

/**
 * Connect webhook (events from connected accounts). Records the outcome on the PaymentIntent's
 * metadata in the user's own Stripe account (invoicejot_status = paid | failed), so we still keep no
 * database. Returns what it did, for logging/tests.
 */
export async function handleConnectEvent(stripe: StripeLike, event: Stripe.Event): Promise<{ handled: boolean; action?: string }> {
  if (!PAID_EVENTS.has(event.type) && !FAILED_EVENTS.has(event.type)) return { handled: false };
  const session = event.data.object as Stripe.Checkout.Session;
  const ref = session.metadata?.invoicejot_ref;
  const account = event.account;
  if (!ref || !account) return { handled: false };
  const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!piId) return { handled: false };
  let status: 'paid' | 'failed' | null = null;
  if (FAILED_EVENTS.has(event.type)) status = 'failed';
  else if (session.payment_status === 'paid') status = 'paid';
  if (!status) return { handled: true, action: 'awaiting_async_payment' };
  await stripe.paymentIntents.update(piId, { metadata: { invoicejot_status: status, invoicejot_event: event.id } }, { stripeAccount: account });
  return { handled: true, action: `marked_${status}` };
}

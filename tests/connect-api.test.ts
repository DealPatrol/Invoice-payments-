import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accountKeyFor, signPayToken, verifyAccountKey, verifyPayToken } from '@/lib/connect/tokens';
import { applicationFee, feePercentLabel, parseFeeBps, toMinorUnits } from '@/lib/connect/money';
import { connectConfig } from '@/lib/connect/config';

const SECRET = 'test-link-secret-0123456789abcdefghijklmnop';
const ACCT = 'acct_1TestAbcDEF123';

// ---- Stripe mock (module-level so the real route files can be imported unchanged) ----
const m = vi.hoisted(() => ({
  accountsCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
  linksCreate: vi.fn(),
  sessionsCreate: vi.fn(),
  piList: vi.fn(),
  piUpdate: vi.fn(),
  constructEvent: vi.fn(),
  ctorArgs: [] as unknown[],
}));
vi.mock('stripe', () => {
  class FakeStripe {
    v2 = { core: { accounts: { create: m.accountsCreate, retrieve: m.accountsRetrieve }, accountLinks: { create: m.linksCreate } } };
    checkout = { sessions: { create: m.sessionsCreate } };
    paymentIntents = { list: m.piList, update: m.piUpdate };
    webhooks = { constructEvent: m.constructEvent };
    constructor(...args: unknown[]) {
      m.ctorArgs.push(args);
    }
  }
  return { default: FakeStripe };
});

function asyncList<T>(items: T[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const i of items) yield i;
    },
  };
}

function activeAccount(card = 'active', entries: unknown[] = []) {
  return { id: ACCT, display_name: 'Rivera Plumbing', defaults: { currency: 'usd' }, configuration: { merchant: { capabilities: { card_payments: { status: card } } } }, requirements: { entries } };
}

function post(body: unknown, origin = 'capacitor://localhost') {
  return new Request('https://invoicejot.com/api/connect/x', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy');
  vi.stubEnv('INVOICEJOT_LINK_SECRET', SECRET);
  vi.stubEnv('INVOICEJOT_PLATFORM_FEE_BPS', '');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://invoicejot.com');
  vi.stubEnv('STRIPE_CONNECT_WEBHOOK_SECRET', 'whsec_test');
  for (const f of [m.accountsCreate, m.accountsRetrieve, m.linksCreate, m.sessionsCreate, m.piList, m.piUpdate, m.constructEvent]) f.mockReset();
  m.linksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/setup/s/abc' });
});

describe('money + fee helpers', () => {
  it('defaults the platform fee to 1% and rounds the fee down', () => {
    expect(parseFeeBps(undefined)).toBe(100);
    expect(parseFeeBps('50')).toBe(50);
    expect(parseFeeBps('-3')).toBe(100);
    expect(parseFeeBps('99999')).toBe(1000);
    expect(applicationFee(12345, 100)).toBe(123);
    expect(applicationFee(99, 100)).toBe(0);
    expect(feePercentLabel(100)).toBe('1%');
    expect(feePercentLabel(50)).toBe('0.5%');
  });
  it('converts to minor units, including zero-decimal currencies', () => {
    expect(toMinorUnits(123.45, 'USD')).toBe(12345);
    expect(toMinorUnits(1.005, 'USD')).toBe(101);
    expect(toMinorUnits(5000, 'JPY')).toBe(5000);
  });
  it('requires a long link secret', () => {
    expect(() => connectConfig({ INVOICEJOT_LINK_SECRET: 'short' })).toThrow(/INVOICEJOT_LINK_SECRET/);
  });
});

describe('stateless tokens', () => {
  it('account keys verify only for their account', () => {
    const key = accountKeyFor(SECRET, ACCT);
    expect(verifyAccountKey(SECRET, ACCT, key)).toBe(true);
    expect(verifyAccountKey(SECRET, 'acct_1OtherAccount9', key)).toBe(false);
    expect(verifyAccountKey('another-secret-0123456789abcdefghijkl', ACCT, key)).toBe(false);
  });
  it('pay tokens cannot be tampered with and carry no client PII', () => {
    const t = signPayToken(SECRET, { v: 1, a: ACCT, m: 15000, c: 'USD', n: 'INV-0042', r: 'ref_abcdefgh123', i: 1_800_000_000 });
    expect(verifyPayToken(SECRET, t)).toMatchObject({ a: ACCT, m: 15000, n: 'INV-0042' });
    const [body, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), m: 1 })).toString('base64url');
    expect(verifyPayToken(SECRET, `${forged}.${sig}`)).toBeNull();
    expect(Object.keys(JSON.parse(Buffer.from(body, 'base64url').toString())).sort()).toEqual(['a', 'c', 'i', 'm', 'n', 'r', 'v']);
  });
});

describe('POST /api/connect/accounts', () => {
  it('creates an Accounts v2 merchant account (full dashboard, Stripe-owned fees and losses) and an onboarding link', async () => {
    m.accountsCreate.mockResolvedValue({ id: ACCT });
    const { POST } = await import('@/app/api/connect/accounts/route');
    const res = await POST(post({ country: 'US', currency: 'usd' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ accountId: ACCT, accountKey: accountKeyFor(SECRET, ACCT), onboardingUrl: 'https://connect.stripe.com/setup/s/abc' });
    const args = m.accountsCreate.mock.calls[0][0];
    expect(args).toMatchObject({
      dashboard: 'full',
      identity: { country: 'us' },
      defaults: { currency: 'usd', responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
    });
    expect(args).not.toHaveProperty('type');
    expect(JSON.stringify(args)).not.toMatch(/email|contact/);
    expect(m.linksCreate.mock.calls[0][0]).toMatchObject({
      account: ACCT,
      use_case: { type: 'account_onboarding', account_onboarding: { configurations: ['merchant'], return_url: 'https://invoicejot.com/connect/return', refresh_url: 'https://invoicejot.com/connect/refresh' } },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
  });
  it('rejects unsupported countries and answers 503 when Stripe is not configured', async () => {
    const { POST } = await import('@/app/api/connect/accounts/route');
    expect((await POST(post({ country: 'zz' }))).status).toBe(400);
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const r = await POST(post({ country: 'us' }));
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe('not_configured');
  });
  it('does not echo CORS for unknown origins', async () => {
    m.accountsCreate.mockResolvedValue({ id: ACCT });
    const { POST } = await import('@/app/api/connect/accounts/route');
    const res = await POST(post({}, 'https://evil.example'));
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('status, onboarding link and pay links', () => {
  const key = () => accountKeyFor(SECRET, ACCT);
  it('needs the account key', async () => {
    const { POST } = await import('@/app/api/connect/status/route');
    const res = await POST(post({ accountId: ACCT, accountKey: 'nope-nope-nope-nope-nope' }));
    expect(res.status).toBe(401);
    expect(m.accountsRetrieve).not.toHaveBeenCalled();
  });
  it('maps v2 capability status to app states', async () => {
    const { POST } = await import('@/app/api/connect/status/route');
    m.accountsRetrieve.mockResolvedValueOnce(activeAccount('active'));
    expect(await (await POST(post({ accountId: ACCT, accountKey: key() }))).json()).toMatchObject({ state: 'active', cardPayments: 'active', feeBps: 100, feeLabel: '1%' });
    m.accountsRetrieve.mockResolvedValueOnce(activeAccount('restricted', [{ awaiting_action_from: 'user', minimum_deadline: { status: 'currently_due' } }]));
    expect(await (await POST(post({ accountId: ACCT, accountKey: key() }))).json()).toMatchObject({ state: 'needs_onboarding', requirementsDue: 1 });
    m.accountsRetrieve.mockResolvedValueOnce(activeAccount('pending'));
    expect(await (await POST(post({ accountId: ACCT, accountKey: key() }))).json()).toMatchObject({ state: 'pending' });
    expect(m.accountsRetrieve.mock.calls[0][1]).toEqual({ include: ['configuration.merchant', 'requirements', 'defaults'] });
  });
  it('makes a fresh onboarding link', async () => {
    const { POST } = await import('@/app/api/connect/onboarding-link/route');
    expect(await (await POST(post({ accountId: ACCT, accountKey: key() }))).json()).toEqual({ url: 'https://connect.stripe.com/setup/s/abc' });
  });
  it('signs a pay link without calling Stripe and validates input', async () => {
    const { POST } = await import('@/app/api/connect/pay-links/route');
    const ok = await (await POST(post({ accountId: ACCT, accountKey: key(), amount: 250.5, currency: 'usd', invoiceNumber: 'INV-0007', ref: 'ref_1234567890' }))).json();
    expect(ok.url).toMatch(/^https:\/\/invoicejot\.com\/pay-online\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{32}$/);
    expect(ok).toMatchObject({ amountMinor: 25050, currency: 'USD', feeMinor: 250 });
    expect(m.sessionsCreate).not.toHaveBeenCalled();
    expect((await POST(post({ accountId: ACCT, accountKey: key(), amount: 0.2, currency: 'usd', invoiceNumber: 'INV-1', ref: 'ref_1234567890' }))).status).toBe(400);
    expect((await POST(post({ accountId: ACCT, accountKey: key(), amount: 10, currency: 'KWD', invoiceNumber: 'INV-1', ref: 'ref_1234567890' }))).status).toBe(400);
    expect((await POST(post({ accountId: ACCT, accountKey: key(), amount: 10, currency: 'usd', invoiceNumber: 'INV-1', ref: 'x' }))).status).toBe(400);
  });
});

function token(m_ = 15000) {
  return signPayToken(SECRET, { v: 1, a: ACCT, m: m_, c: 'USD', n: 'INV-0042', r: 'ref_abcdefgh123', i: 1_800_000_000 });
}

describe('GET /pay-online/[token] (hosted Checkout, direct charge with application fee)', () => {
  const ctx = (t: string) => ({ params: Promise.resolve({ token: t }) });
  it('creates a Checkout Session on the connected account with a 1% application fee', async () => {
    m.accountsRetrieve.mockResolvedValue(activeAccount());
    m.piList.mockReturnValue(asyncList([]));
    m.sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const { GET } = await import('@/app/pay-online/[token]/route');
    const res = await GET(new Request('https://invoicejot.com/pay-online/x'), ctx(token()));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    const [params, opts] = m.sessionsCreate.mock.calls[0];
    expect(opts).toEqual({ stripeAccount: ACCT });
    expect(params).toMatchObject({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 15000, product_data: { name: 'Invoice INV-0042' } } }],
      payment_intent_data: { application_fee_amount: 150, metadata: { invoicejot_ref: 'ref_abcdefgh123' } },
    });
    expect(params).not.toHaveProperty('payment_method_types');
    expect(params).not.toHaveProperty('customer_email');
  });
  it('honours INVOICEJOT_PLATFORM_FEE_BPS and charges only what is left after a partial payment', async () => {
    vi.stubEnv('INVOICEJOT_PLATFORM_FEE_BPS', '50');
    m.accountsRetrieve.mockResolvedValue(activeAccount());
    m.piList.mockReturnValue(asyncList([{ id: 'pi_1', status: 'succeeded', amount: 5000, amount_received: 5000, currency: 'usd', created: 1_800_000_100, metadata: { invoicejot_ref: 'ref_abcdefgh123' } }]));
    m.sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_2' });
    const { GET } = await import('@/app/pay-online/[token]/route');
    await GET(new Request('https://invoicejot.com/pay-online/x'), ctx(token()));
    expect(m.sessionsCreate.mock.calls[0][0]).toMatchObject({ line_items: [{ price_data: { unit_amount: 10000 } }], payment_intent_data: { application_fee_amount: 50 } });
  });
  it('does not charge twice, refuses forged links and unfinished accounts', async () => {
    const { GET } = await import('@/app/pay-online/[token]/route');
    m.accountsRetrieve.mockResolvedValue(activeAccount());
    m.piList.mockReturnValue(asyncList([{ id: 'pi_1', status: 'succeeded', amount: 15000, amount_received: 15000, currency: 'usd', created: 1_800_000_100, metadata: { invoicejot_ref: 'ref_abcdefgh123' } }]));
    expect((await GET(new Request('https://x'), ctx(token()))).headers.get('location')).toBe('https://invoicejot.com/paid?status=already');
    expect((await GET(new Request('https://x'), ctx(token() + 'x'))).headers.get('location')).toBe('https://invoicejot.com/paid?status=unavailable&code=invalid');
    m.accountsRetrieve.mockResolvedValue(activeAccount('pending'));
    expect((await GET(new Request('https://x'), ctx(token()))).headers.get('location')).toBe('https://invoicejot.com/paid?status=unavailable&code=not_ready');
    expect(m.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/connect/invoice-status', () => {
  it('reads paid status live from Stripe for that invoice reference only', async () => {
    m.piList.mockReturnValue(
      asyncList([
        { id: 'pi_other', status: 'succeeded', amount: 999, amount_received: 999, currency: 'usd', created: 1_800_000_050, metadata: { invoicejot_ref: 'ref_someoneelse' } },
        { id: 'pi_1', status: 'succeeded', amount: 15000, amount_received: 15000, currency: 'usd', created: 1_800_000_100, metadata: { invoicejot_ref: 'ref_abcdefgh123' } },
      ]),
    );
    const { POST } = await import('@/app/api/connect/invoice-status/route');
    const json = await (await POST(post({ accountId: ACCT, accountKey: accountKeyFor(SECRET, ACCT), token: token() }))).json();
    expect(json).toMatchObject({ paid: true, amountPaid: 150, amountMinorPaid: 15000, currency: 'USD', processing: false });
    expect(json.payments).toHaveLength(1);
    expect(m.piList.mock.calls[0]).toEqual([{ created: { gte: 1_800_000_000 - 300 }, limit: 100 }, { stripeAccount: ACCT }]);
  });
  it('rejects a token for a different account', async () => {
    const other = 'acct_1OtherAccount9';
    const { POST } = await import('@/app/api/connect/invoice-status/route');
    const res = await POST(post({ accountId: other, accountKey: accountKeyFor(SECRET, other), token: token() }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/connect/webhook', () => {
  const req = (sig: string | null = 't=1,v1=abc') => new Request('https://invoicejot.com/api/connect/webhook', { method: 'POST', headers: sig ? { 'stripe-signature': sig } : {}, body: '{"id":"evt"}' });
  it('verifies the signature with the Connect webhook secret', async () => {
    const { POST } = await import('@/app/api/connect/webhook/route');
    expect((await POST(req(null))).status).toBe(400);
    m.constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    expect((await POST(req())).status).toBe(400);
    expect(m.constructEvent.mock.calls[0][2]).toBe('whsec_test');
  });
  it('records paid / failed on the PaymentIntent in the connected account (no database)', async () => {
    const { POST } = await import('@/app/api/connect/webhook/route');
    m.constructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed', account: ACCT, data: { object: { payment_status: 'paid', payment_intent: 'pi_1', metadata: { invoicejot_ref: 'ref_abcdefgh123' } } } });
    const json = await (await POST(req())).json();
    expect(json).toMatchObject({ received: true, handled: true, action: 'marked_paid' });
    expect(m.piUpdate).toHaveBeenCalledWith('pi_1', { metadata: { invoicejot_status: 'paid', invoicejot_event: 'evt_1' } }, { stripeAccount: ACCT });

    m.constructEvent.mockReturnValue({ id: 'evt_2', type: 'checkout.session.completed', account: ACCT, data: { object: { payment_status: 'unpaid', payment_intent: 'pi_2', metadata: { invoicejot_ref: 'ref_abcdefgh123' } } } });
    expect(await (await POST(req())).json()).toMatchObject({ action: 'awaiting_async_payment' });

    m.constructEvent.mockReturnValue({ id: 'evt_3', type: 'checkout.session.async_payment_failed', account: ACCT, data: { object: { payment_status: 'unpaid', payment_intent: 'pi_2', metadata: { invoicejot_ref: 'ref_abcdefgh123' } } } });
    expect(await (await POST(req())).json()).toMatchObject({ action: 'marked_failed' });

    m.constructEvent.mockReturnValue({ id: 'evt_4', type: 'customer.created', data: { object: {} } });
    expect(await (await POST(req())).json()).toMatchObject({ handled: false });
  });
  it('asks Stripe to retry when recording fails', async () => {
    const { POST } = await import('@/app/api/connect/webhook/route');
    m.constructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed', account: ACCT, data: { object: { payment_status: 'paid', payment_intent: 'pi_1', metadata: { invoicejot_ref: 'ref_abcdefgh123' } } } });
    m.piUpdate.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await POST(req())).status).toBe(500);
  });
});

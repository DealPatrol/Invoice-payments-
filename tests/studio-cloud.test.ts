import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  docs: new Map<string, { id: string; userId: string; data: unknown; shareToken: string | null }>(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    studioDocument: {
      findFirst: vi.fn(async ({ where }) => { const d = db.docs.get(where.id); return d && d.userId === where.userId ? d : null; }),
      findUnique: vi.fn(async ({ where }) => [...db.docs.values()].find((d) => d.shareToken === where.shareToken) ?? null),
      update: vi.fn(async ({ where, data }) => { const d = db.docs.get(where.id)!; Object.assign(d, data); return d; }),
    },
  },
}));

import { getByToken, mergeServerPayments, newShareToken, recordStripePayment, respondToEstimate, shareDocument } from '@/lib/studio-server';
import { processStripeEvent } from '@/lib/stripe-webhook';
import { DEFAULT_PROFILE, newInvoice, newLineItem } from '@/lib/studio';
import { emailEnabled, logProvider, recipientAllowed, sendStudioEmail } from '@/lib/studio-mail';
import { amountDue, lateFee } from '@/lib/studio-ops';
import type Stripe from 'stripe';

const inv = { ...newInvoice(DEFAULT_PROFILE), status: 'sent' as const, items: [newLineItem({ quantity: 1, unitPrice: 200 })] };
const est = { ...newInvoice(DEFAULT_PROFILE, 'estimate'), estimateStatus: 'sent' as const, items: [newLineItem({ quantity: 1, unitPrice: 80 })] };

beforeEach(() => {
  db.docs.clear();
  db.docs.set(inv.id, { id: inv.id, userId: 'u1', data: inv, shareToken: null });
  db.docs.set(est.id, { id: est.id, userId: 'u1', data: est, shareToken: 'e'.repeat(32) });
});
afterEach(() => vi.unstubAllEnvs());

describe('share tokens', () => {
  it('are 32-char base64url with 192 bits of entropy and unique', () => {
    const a = newShareToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(newShareToken()).not.toBe(a);
  });
  it('are only issued to the owner and are stable', async () => {
    expect(await shareDocument('intruder', inv.id)).toBeNull();
    const t = await shareDocument('u1', inv.id);
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await shareDocument('u1', inv.id)).toBe(t);
    expect((await getByToken(t!))?.invoice.id).toBe(inv.id);
  });
  it('rejects malformed tokens without a lookup', async () => {
    expect(await getByToken('../../etc')).toBeNull();
    expect(await getByToken('short')).toBeNull();
  });
});

describe('estimate responses', () => {
  it('accepts once, then refuses changes', async () => {
    const r = await respondToEstimate('e'.repeat(32), 'accept', 'Terry Pines');
    expect('invoice' in r && r.invoice?.estimateStatus).toBe('accepted');
    expect('invoice' in r && r.invoice?.clientResponse?.name).toBe('Terry Pines');
    const again = await respondToEstimate('e'.repeat(32), 'decline', 'Terry');
    expect('status' in again && again.status).toBe(409);
  });
});

describe('stripe webhook → studio payments', () => {
  const session = (over: Partial<Stripe.Checkout.Session> = {}) => ({
    id: 'cs_test_1', created: 1798000000, amount_total: 20000, payment_status: 'paid',
    metadata: { kind: 'studio_invoice', studioDocId: inv.id, userId: 'u1' }, ...over,
  }) as unknown as Stripe.Checkout.Session;
  const event = (type: string, obj: Stripe.Checkout.Session, livemode = false) => ({ type, livemode, data: { object: obj } }) as unknown as Stripe.Event;

  it('records a card payment and marks paid, idempotently', async () => {
    await processStripeEvent(event('checkout.session.completed', session()));
    await processStripeEvent(event('checkout.session.completed', session()));
    const data = db.docs.get(inv.id)!.data as typeof inv;
    expect(data.payments).toHaveLength(1);
    expect(data.payments[0]).toMatchObject({ amount: 200, method: 'Stripe', reference: 'cs_test_1' });
    expect(data.status).toBe('paid');
  });
  it('waits for ACH to clear before recording', async () => {
    await processStripeEvent(event('checkout.session.completed', session({ payment_status: 'unpaid' })));
    expect((db.docs.get(inv.id)!.data as typeof inv).payments).toHaveLength(0);
    await processStripeEvent(event('checkout.session.async_payment_succeeded', session()));
    expect((db.docs.get(inv.id)!.data as typeof inv).payments).toHaveLength(1);
  });
  it('refuses live-mode events unless explicitly allowed', async () => {
    await expect(processStripeEvent(event('checkout.session.completed', session(), true))).rejects.toThrow(/Live/);
  });
  it('rejects metadata pointing at another user', async () => {
    await expect(recordStripePayment(inv.id, 'intruder', { date: '2026-10-27', amount: 1, method: 'Stripe', reference: 'x' })).rejects.toThrow();
  });
  it('sync keeps server-recorded Stripe payments the browser has not seen', () => {
    const server = { ...inv, payments: [{ id: 'p1', date: '2026-10-27', amount: 200, method: 'Stripe', reference: 'cs' }] };
    expect(mergeServerPayments(inv, server).status).toBe('paid');
  });
});

describe('late fees', () => {
  const base = { ...inv, dueDate: '2026-10-01', business: { ...inv.business, lateFeePercent: 10 } };
  it('are off unless opted in', () => {
    expect(lateFee(base, '2026-10-27')).toBe(0);
  });
  it('apply once when overdue', () => {
    expect(lateFee({ ...base, applyLateFee: true }, '2026-10-27')).toBe(20);
    expect(amountDue({ ...base, applyLateFee: true }, '2026-10-27')).toBe(220);
    expect(lateFee({ ...base, applyLateFee: true }, '2026-09-30')).toBe(0);
  });
});

describe('email abstraction', () => {
  it('is off by default and never sends', async () => {
    expect(emailEnabled()).toBe(false);
    const send = vi.spyOn(logProvider, 'send');
    await expect(sendStudioEmail({ to: 'a@example.com', subject: 's', text: 't' }, logProvider)).rejects.toThrow(/disabled/);
    expect(send).not.toHaveBeenCalled();
  });
  it('enforces the allowlist when enabled', async () => {
    vi.stubEnv('STUDIO_EMAIL_ENABLED', 'true');
    vi.stubEnv('STUDIO_EMAIL_ALLOWLIST', 'me@example.com');
    expect(recipientAllowed('ME@example.com')).toBe(true);
    await expect(sendStudioEmail({ to: 'other@example.com', subject: 's', text: 't' }, logProvider)).rejects.toThrow(/ALLOWLIST/);
    await expect(sendStudioEmail({ to: 'me@example.com', subject: 's', text: 't' }, logProvider)).resolves.toHaveProperty('id');
  });
});

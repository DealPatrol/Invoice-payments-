import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: m.findUnique, update: m.update, updateMany: vi.fn() }, pendingPlan: { upsert: m.upsert } } }));
vi.mock('@/lib/studio-server', () => ({ recordStripePayment: vi.fn() }));

import { processStripeEvent } from '@/lib/stripe-webhook';

function event(session: Record<string, unknown>) {
  return { id: 'evt', type: 'checkout.session.completed', livemode: true, data: { object: session } } as never;
}

describe('plan bought through a Payment Link', () => {
  beforeEach(() => { m.findUnique.mockReset(); m.update.mockReset(); });

  it('activates Pro for the account named in client_reference_id', async () => {
    m.findUnique.mockResolvedValueOnce({ id: 'user_1' });
    await processStripeEvent(event({ mode: 'subscription', payment_link: 'plink_1UaAMMI7O0BzBS79ddyjQpou', client_reference_id: 'user_1', customer: 'cus_1', subscription: 'sub_1', metadata: {} }));
    expect(m.update).toHaveBeenCalledWith({ where: { id: 'user_1' }, data: { plan: 'pro', subscriptionStatus: 'active', stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1' } });
  });

  it('falls back to the checkout email for Solo', async () => {
    m.findUnique.mockResolvedValueOnce({ id: 'user_2' });
    await processStripeEvent(event({ mode: 'subscription', payment_link: 'plink_1UaAMKI7O0BzBS79OFRsHfFA', client_reference_id: null, customer_details: { email: 'Shop@Example.com' }, customer: 'cus_2', subscription: 'sub_2', metadata: {} }));
    expect(m.findUnique).toHaveBeenCalledWith({ where: { email: 'shop@example.com' }, select: { id: true } });
    expect(m.update.mock.calls[0][0].data.plan).toBe('solo');
  });

  it('holds the plan for the email when the buyer has no account yet', async () => {
    m.findUnique.mockResolvedValue(null);
    await expect(processStripeEvent(event({ mode: 'subscription', payment_link: 'plink_1UaAMKI7O0BzBS79OFRsHfFA', customer_details: { email: 'nobody@example.com' }, metadata: {} }))).resolves.toBeUndefined();
    expect(m.update).not.toHaveBeenCalled();
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'nobody@example.com' } }));
  });

  it('maps the Workspace Pro link and keeps the old Linko link working', async () => {
    m.findUnique.mockResolvedValue({ id: 'user_3' });
    for (const link of ['plink_1UaHF1RJZZUpaweBOuLXzacr', 'plink_1UaAMMI7O0BzBS79ddyjQpou']) {
      m.update.mockReset();
      await processStripeEvent(event({ mode: 'subscription', payment_link: link, client_reference_id: 'user_3', customer: 'cus_3', subscription: 'sub_3', metadata: {} }));
      expect(m.update.mock.calls[0][0].data.plan).toBe('pro');
    }
  });

  it('maps the Workspace Solo link', async () => {
    m.findUnique.mockResolvedValue({ id: 'user_4' });
    await processStripeEvent(event({ mode: 'subscription', payment_link: 'plink_1UaHEyRJZZUpaweB94VQOejw', client_reference_id: 'user_4', customer: 'cus_4', subscription: 'sub_4', metadata: {} }));
    expect(m.update.mock.calls[0][0].data.plan).toBe('solo');
  });
});

describe('Workspace billing ids', () => {
  it('pricing links point at the Workspace payment links and prices map to plans', async () => {
    const { PLAN_LINKS } = await import('@/lib/config');
    const { PRICE_PLANS, PAYMENT_LINK_PLANS } = await import('@/lib/lab-plan');
    expect(PLAN_LINKS.solo).toBe('https://buy.stripe.com/cNidRb9jE2W97y97ec0Ba03');
    expect(PLAN_LINKS.pro).toBe('https://buy.stripe.com/3cIbJ3cvQeERcSt8ig0Ba04');
    expect(PRICE_PLANS.price_1UaHEVRJZZUpaweBCImHfRDU).toBe('solo');
    expect(PRICE_PLANS.price_1UaHEbRJZZUpaweBHWUMl8Aq).toBe('pro');
    expect(PRICE_PLANS.price_1UaAMBI7O0BzBS79qfUYCYBi).toBe('pro');
    expect(Object.keys(PAYMENT_LINK_PLANS)).toHaveLength(4);
  });
});

import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/s' }));
const findUnique = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { studioDocument: { findUnique } } }));
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { create } }; } }));

import { POST } from '@/app/api/studio/checkout/route';
import { DEFAULT_PROFILE, newInvoice, newLineItem } from '@/lib/studio';

const TOKEN = 'a'.repeat(32);
const inv = { ...newInvoice(DEFAULT_PROFILE), items: [newLineItem({ quantity: 2, unitPrice: 50 })] };
const req = (body: unknown) => new NextRequest('http://localhost/api/studio/checkout', { method: 'POST', body: JSON.stringify(body) });
const enable = () => { vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'true'); vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x'); vi.stubEnv('DATABASE_URL', 'postgres://x'); vi.stubEnv('DEMO_MODE', 'false'); };

afterEach(() => { vi.unstubAllEnvs(); findUnique.mockReset(); create.mockClear(); });

describe('studio checkout', () => {
  it('is disabled by default', async () => {
    expect((await POST(req({ token: TOKEN }))).status).toBe(503);
  });
  it('refuses live keys unless explicitly allowed', async () => {
    enable();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_x');
    expect((await POST(req({ token: TOKEN }))).status).toBe(503);
  });
  it('rejects unknown or malformed tokens and ignores client-supplied documents', async () => {
    enable();
    findUnique.mockResolvedValue(null);
    expect((await POST(req({ token: TOKEN }))).status).toBe(400);
    expect((await POST(req({ doc: 'tampered', amount: 1 }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
  it('charges the server-side balance with card + ACH', async () => {
    enable();
    findUnique.mockResolvedValue({ userId: 'u1', shareToken: TOKEN, data: inv });
    const res = await POST(req({ token: TOKEN, amount: 1 }));
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/s' });
    const args = create.mock.calls[0][0];
    expect(args.line_items[0].price_data.unit_amount).toBe(10000);
    expect(args.payment_method_types).toEqual(['card', 'us_bank_account']);
    expect(args.metadata).toMatchObject({ kind: 'studio_invoice', studioDocId: inv.id, userId: 'u1' });
  });
  it('adds an opted-in late fee when overdue', async () => {
    enable();
    const overdue = { ...inv, status: 'sent', dueDate: '2020-01-01', applyLateFee: true, business: { ...inv.business, lateFeePercent: 5 } };
    findUnique.mockResolvedValue({ userId: 'u1', shareToken: TOKEN, data: overdue });
    await POST(req({ token: TOKEN }));
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(10500);
  });
});

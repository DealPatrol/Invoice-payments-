import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/s' }));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { create } }; } }));

import { POST } from '@/app/api/studio/checkout/route';
import { DEFAULT_PROFILE, encodeInvoice, newInvoice, newLineItem } from '@/lib/studio';

const doc = encodeInvoice({ ...newInvoice(DEFAULT_PROFILE), items: [newLineItem({ quantity: 2, unitPrice: 50 })] });
const req = (body: unknown) => new NextRequest('http://localhost/api/studio/checkout', { method: 'POST', body: JSON.stringify(body) });

afterEach(() => { vi.unstubAllEnvs(); });

describe('studio checkout', () => {
  it('is disabled by default', async () => {
    expect((await POST(req({ doc }))).status).toBe(503);
  });
  it('refuses live keys unless explicitly allowed', async () => {
    vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'true');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_x');
    expect((await POST(req({ doc }))).status).toBe(503);
  });
  it('creates a test-mode session for the balance due', async () => {
    vi.stubEnv('STUDIO_CHECKOUT_ENABLED', 'true');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    const res = await POST(req({ doc }));
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/s' });
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(10000);
  });
});

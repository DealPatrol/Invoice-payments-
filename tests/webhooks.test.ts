import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  processEvent: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    webhookEvent: {
      create: mocks.createEvent,
      deleteMany: mocks.deleteEvent,
    },
  },
}));
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }),
}));
vi.mock('@/lib/stripe-webhook', () => ({
  processStripeEvent: mocks.processEvent,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

describe('Stripe webhook route', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    mocks.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: {} },
    });
    mocks.createEvent.mockResolvedValue({ id: 'evt_1' });
    mocks.processEvent.mockResolvedValue(undefined);
  });

  it('verifies, records, and processes a webhook', async () => {
    const response = await POST(new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'signature' },
      body: '{}',
    }));
    expect(response.status).toBe(200);
    expect(mocks.constructEvent).toHaveBeenCalledWith('{}', 'signature', 'whsec_test');
    expect(mocks.createEvent).toHaveBeenCalledWith({
      data: { id: 'evt_1', type: 'checkout.session.completed' },
    });
    expect(mocks.processEvent).toHaveBeenCalledOnce();
  });

  it('treats a repeated event as an idempotent success', async () => {
    mocks.createEvent.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.13.0',
      })
    );
    const response = await POST(new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'signature' },
      body: '{}',
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(mocks.processEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature before database work', async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const response = await POST(new NextRequest('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'bad' },
      body: '{}',
    }));
    expect(response.status).toBe(400);
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });
});

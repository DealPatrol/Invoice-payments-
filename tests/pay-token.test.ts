import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getInvoiceByPayToken: vi.fn(),
  createCheckoutSession: vi.fn(),
  findOwner: vi.fn(),
}));

vi.mock('@/lib/config', () => ({ isDemoMode: () => false }));
vi.mock('@/lib/invoice-service', () => ({
  getInvoiceByPayToken: mocks.getInvoiceByPayToken,
}));
vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: mocks.createCheckoutSession,
}));
vi.mock('@/lib/db', () => ({
  prisma: { invoice: { findUnique: mocks.findOwner } },
}));

import { GET, POST } from '@/app/api/pay/[token]/route';

const invoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2026-0001',
  status: 'sent',
  payToken: 'secure-token',
  total: 100,
};

describe('pay token route', () => {
  beforeEach(() => {
    mocks.getInvoiceByPayToken.mockResolvedValue(invoice);
    mocks.findOwner.mockResolvedValue({ userId: 'user-1' });
    mocks.createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
  });

  it('loads an invoice by its opaque token without authentication', async () => {
    const response = await GET(new NextRequest('http://localhost'), {
      params: { token: 'secure-token' },
    });
    expect(response.status).toBe(200);
    expect(mocks.getInvoiceByPayToken).toHaveBeenCalledWith('secure-token');
  });

  it('creates checkout against the invoice owner', async () => {
    const response = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: { token: 'secure-token' },
    });
    expect(response.status).toBe(200);
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(invoice, 'user-1');
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.stripe.test/session',
    });
  });

  it('rejects replayed payment attempts for paid invoices', async () => {
    mocks.getInvoiceByPayToken.mockResolvedValue({ ...invoice, status: 'paid' });
    const response = await POST(new NextRequest('http://localhost', { method: 'POST' }), {
      params: { token: 'secure-token' },
    });
    expect(response.status).toBe(400);
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });
});

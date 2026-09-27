import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  createInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  getInvoice: vi.fn(),
  listInvoices: vi.fn(),
  updateInvoiceStatus: vi.fn(),
}));

vi.mock('@/lib/invoice-service', () => service);
vi.mock('@/lib/tenant', () => ({
  getTenantId: vi.fn().mockResolvedValue('user-1'),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import { GET as list, POST as create } from '@/app/api/invoices/route';
import { DELETE as remove, GET as read, PATCH as update } from '@/app/api/invoices/[id]/route';

const invoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-2026-0001',
  clientName: 'Acme',
  clientEmail: 'billing@example.com',
  country: 'US',
  currency: 'USD',
  network: '',
  status: 'draft',
  dueDate: '2026-10-01',
  issuedDate: '2026-09-27',
  subtotal: 100,
  taxRate: 0,
  taxAmount: 0,
  total: 100,
  notes: '',
  items: [{ description: 'Work', quantity: 1, unitRate: 100 }],
  payToken: 'token',
};

describe('invoice CRUD routes', () => {
  beforeEach(() => {
    service.listInvoices.mockResolvedValue({ invoices: [invoice], mode: 'postgres' });
    service.createInvoice.mockResolvedValue({ invoice, mode: 'postgres' });
    service.getInvoice.mockResolvedValue(invoice);
    service.updateInvoiceStatus.mockResolvedValue({ ...invoice, status: 'sent' });
    service.deleteInvoice.mockResolvedValue(true);
  });

  it('lists only through the authenticated tenant', async () => {
    const response = await list(new NextRequest('http://localhost/api/invoices?status=draft'));
    expect(response.status).toBe(200);
    expect(service.listInvoices).toHaveBeenCalledWith('user-1', {
      status: 'draft',
      search: undefined,
    });
  });

  it('creates a validated invoice for the tenant', async () => {
    const response = await create(new NextRequest('http://localhost/api/invoices', {
      method: 'POST',
      body: JSON.stringify({
        clientName: 'Acme',
        clientEmail: 'billing@example.com',
        country: 'US',
        currency: 'USD',
        dueDate: '2026-10-01',
        taxRate: 0,
        items: [{ description: 'Work', quantity: 1, unitRate: 100 }],
      }),
    }));
    expect(response.status).toBe(201);
    expect(service.createInvoice).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ clientName: 'Acme' })
    );
  });

  it('reads, updates, and deletes with the tenant ID', async () => {
    const context = { params: { id: 'invoice-1' } };
    expect((await read(new NextRequest('http://localhost'), context)).status).toBe(200);
    expect((await update(new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'sent' }),
    }), context)).status).toBe(200);
    expect((await remove(new NextRequest('http://localhost'), context)).status).toBe(200);
    expect(service.getInvoice).toHaveBeenCalledWith('user-1', 'invoice-1');
    expect(service.updateInvoiceStatus).toHaveBeenCalledWith('user-1', 'invoice-1', 'sent');
    expect(service.deleteInvoice).toHaveBeenCalledWith('user-1', 'invoice-1');
  });
});

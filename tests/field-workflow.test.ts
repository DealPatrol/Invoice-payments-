import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('DEMO_MODE', 'true');

import {
  applyChangeOrder,
  convertEstimateToInvoice,
  createChangeOrder,
  createEstimateFromPhoto,
  createJob,
  resetFieldDemo,
  respondToReview,
  updateEstimate,
} from '@/lib/field-service';

const userId = 'demo-user';

describe('estimate workflow in demo mode', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
    resetFieldDemo();
  });

  it('turns an approved photo estimate into an invoice and refuses a second conversion', async () => {
    const job = await createJob(userId, {
      clientId: '1',
      title: 'Side yard',
      siteAddress: '9 Oak Street',
    });
    const drafted = await createEstimateFromPhoto(userId, {
      notes: '40 foot privacy fence',
      images: [],
      clientId: '1',
      jobId: job.id,
      taxRate: 0.05,
    });
    expect(drafted.source).toBe('demo');
    expect(drafted.estimate.status).toBe('draft');
    expect(drafted.estimate.jobId).toBe(job.id);
    expect(drafted.estimate.total).toBeGreaterThan(0);

    await expect(convertEstimateToInvoice(userId, drafted.estimate.id)).rejects.toThrow(/Approve the estimate/);
    await updateEstimate(userId, drafted.estimate.id, { status: 'sent' });
    const approved = await respondToReview(drafted.estimate.reviewToken, { action: 'approve' });
    expect(approved.status).toBe('approved');

    const converted = await convertEstimateToInvoice(userId, drafted.estimate.id);
    expect(converted.estimate.status).toBe('converted');
    expect(converted.estimate.invoiceId).toBe(converted.invoice.id);
    expect(converted.invoice.clientName).toBe('Acme Corp');
    expect(converted.invoice.jobId).toBe(job.id);
    expect(converted.invoice.items.length).toBe(drafted.estimate.items.length);
    expect(converted.invoice.total).toBeCloseTo(drafted.estimate.total, 2);
    await expect(convertEstimateToInvoice(userId, drafted.estimate.id)).rejects.toThrow(/already an invoice/);
  });

  it('amends an approved estimate or invoices the change, and does not do both', async () => {
    const job = await createJob(userId, { clientId: '1', title: 'Patio add-on' });
    const drafted = await createEstimateFromPhoto(userId, {
      notes: '180 sq ft paver patio',
      images: [],
      clientId: '1',
      jobId: job.id,
    });
    await updateEstimate(userId, drafted.estimate.id, { status: 'sent' });
    await respondToReview(drafted.estimate.reviewToken, { action: 'approve' });
    const withChange = await createChangeOrder(userId, drafted.estimate.id, {
      title: 'Extra border',
      reason: 'Customer added a soldier course',
      items: [{ kind: 'materials', description: 'Border pavers', quantity: 40, unit: 'lf', unitPrice: 4 }],
    });
    const change = withChange.changeOrders[0];
    const before = withChange.total;
    const amended = await applyChangeOrder(userId, change.id, 'amend');
    expect(amended.estimate.total).toBeGreaterThan(before);
    expect(amended.estimate.items.some((item) => item.description === 'Border pavers')).toBe(true);
    expect(amended.estimate.changeOrders[0].resolution).toBe('amended');
    await expect(applyChangeOrder(userId, change.id, 'invoice')).rejects.toThrow(/instead of invoicing it twice/);

    const followOn = await createChangeOrder(userId, drafted.estimate.id, {
      title: 'Haul extra spoil',
      items: [{ kind: 'other', description: 'Second dump run', quantity: 1, unit: 'trip', unitPrice: 85 }],
    });
    const second = followOn.changeOrders.find((item) => item.title === 'Haul extra spoil');
    if (!second) throw new Error('missing change order');
    const invoiced = await applyChangeOrder(userId, second.id, 'invoice');
    expect(invoiced.invoice?.items[0].description).toContain('Second dump run');
    expect(invoiced.estimate.changeOrders.find((item) => item.id === second.id)?.status).toBe('invoiced');
    expect(invoiced.invoice?.id).not.toBe(drafted.estimate.invoiceId);
  });

  it('does not let a customer approve a draft', async () => {
    const drafted = await createEstimateFromPhoto(userId, {
      notes: 'repaint 1 room',
      images: [],
      clientId: '2',
    });
    await expect(respondToReview(drafted.estimate.reviewToken, { action: 'approve' })).rejects.toThrow(/Cannot move/);
  });
});

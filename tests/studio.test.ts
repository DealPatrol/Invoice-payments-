import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, calcTotals, decodeInvoice, encodeInvoice, newInvoice, newLineItem, normalizeInvoice } from '@/lib/studio';
import {
  advanceDate, convertEstimate, dashboardStats, displayStatus, generateDueRecurring, invoicesToCSV,
  monthlyRevenue, recordPayment, reminderDraft, removePayment,
} from '@/lib/studio-ops';

const profile = { ...DEFAULT_PROFILE, name: 'Collins Lawncare', ownerName: 'Cole Collins', phone: '(256) 595-3354' };
const make = (amount: number, patch = {}) => ({
  ...newInvoice(profile, 'invoice', '2026-10-01'),
  customer: { name: 'Terry Pines', company: '', email: 'terry@example.com', phone: '', address: '' },
  items: [newLineItem({ description: 'Mowing', quantity: 1, unitPrice: amount })],
  ...patch,
});

describe('totals', () => {
  it('computes qty × rate, discount, tax, shipping and payments', () => {
    const inv = { ...make(0), items: [newLineItem({ quantity: 125, unitPrice: 12 })], discountType: 'amount' as const, discountValue: 100, taxRate: 10, shipping: 25 };
    const t = calcTotals({ ...inv, payments: [{ id: 'p', date: '2026-10-02', amount: 500, method: 'cash', reference: '' }] });
    expect(t).toMatchObject({ subtotal: 1500, discount: 100, tax: 140, total: 1565, amountPaid: 500, balanceDue: 1065 });
  });
});

describe('statuses and payments', () => {
  it('moves sent → partial → paid and back when a payment is removed', () => {
    let inv = make(1000, { status: 'sent', dueDate: '2026-12-01' });
    expect(displayStatus(inv, '2026-10-27')).toBe('sent');
    inv = recordPayment(inv, { date: '2026-10-10', amount: 400, method: 'check', reference: '#12' });
    expect(displayStatus(inv, '2026-10-27')).toBe('partial');
    inv = recordPayment(inv, { date: '2026-10-20', amount: 600, method: 'card', reference: '' });
    expect(inv.status).toBe('paid');
    inv = removePayment(inv, inv.payments[1].id);
    expect(displayStatus(inv, '2026-10-27')).toBe('partial');
  });
  it('flags overdue invoices and rejects bad payments', () => {
    const inv = make(50, { status: 'sent', dueDate: '2026-10-15' });
    expect(displayStatus(inv, '2026-10-27')).toBe('overdue');
    expect(() => recordPayment(inv, { date: '2026-10-27', amount: 0, method: 'cash', reference: '' })).toThrow();
  });
});

describe('estimates', () => {
  it('converts an estimate to a numbered invoice', () => {
    const est = { ...newInvoice(profile, 'estimate', '2026-10-01'), items: [newLineItem({ quantity: 2, unitPrice: 75 })] };
    expect(est.number).toBe('EST-0101');
    const inv = convertEstimate(est, profile, '2026-10-27');
    expect(inv).toMatchObject({ kind: 'invoice', number: 'INV-1001', convertedFromId: est.id, dueDate: '2026-11-11' });
    expect(calcTotals(inv).total).toBe(150);
  });
});

describe('recurring', () => {
  it('advances dates without overflowing short months', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(advanceDate('2026-10-27', 'biweekly')).toBe('2026-11-10');
    expect(advanceDate('2026-11-30', 'quarterly')).toBe('2027-02-28');
  });
  it('creates every owed invoice and bumps numbering', () => {
    const tpl = make(80, { recurring: { interval: 'weekly', nextDate: '2026-10-06', endDate: '', active: true } });
    const out = generateDueRecurring([tpl], profile, '2026-10-27');
    expect(out.created.map((i) => i.issueDate)).toEqual(['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27']);
    expect(out.created.map((i) => i.number)).toEqual(['INV-1001', 'INV-1002', 'INV-1003', 'INV-1004']);
    expect(out.profile.nextNumber).toBe(1005);
    expect(out.invoices.find((i) => i.id === tpl.id)?.recurring?.nextDate).toBe('2026-11-03');
  });
});

describe('dashboard, reminders, csv, links', () => {
  const list = [
    make(1500, { status: 'sent', dueDate: '2026-10-15' }),
    recordPayment(make(2454, { status: 'sent', dueDate: '2026-11-11' }), { date: '2026-10-20', amount: 454, method: 'cash', reference: '' }),
    make(99, { status: 'draft' }),
  ];
  it('summarises outstanding, overdue and paid', () => {
    const s = dashboardStats(list, '2026-10-27');
    expect(s).toMatchObject({ outstanding: 3500, overdue: 1500, overdueCount: 1, paidTotal: 454, paidThisMonth: 454, draftCount: 1 });
    const rev = monthlyRevenue(list, '2026-10-27', 2);
    expect(rev[1]).toEqual({ month: '2026-10', billed: 3954, collected: 454 });
  });
  it('drafts an overdue reminder without sending anything', () => {
    const d = reminderDraft(list[0], '2026-10-27', 'https://example.com/pay');
    expect(d.tone).toBe('overdue');
    expect(d.subject).toContain('12 days past due');
    expect(d.body).toContain('Hi Terry,');
    expect(d.body).toContain('https://example.com/pay');
  });
  it('exports CSV with escaping and round-trips share links', () => {
    const csv = invoicesToCSV([{ ...list[0], customer: { ...list[0].customer, name: 'Pines, Terry' } }], '2026-10-27');
    expect(csv.split('\n')[1]).toContain('"Pines, Terry"');
    const back = decodeInvoice(encodeInvoice(list[1]));
    expect(back?.payments).toHaveLength(1);
    expect(normalizeInvoice({ number: 'OLD-1' }).payments).toEqual([]);
  });
});

import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ prisma: {} }));
import { DEFAULT_PROFILE, calcTotals, newInvoice, newLineItem, type StudioInvoice } from '@/lib/studio';
import {
  DEFAULT_EXTRAS, billToInvoice, dueReminders, ensureBrands, hasStoredExtras, nextReminderDate, normalizeExtras, releaseBilledWork, taxSummary, taxSummaryCSV, unbilled, viewSummary,
  type StudioExtras,
} from '@/lib/studio-suite';
import { mergeServerTracking } from '@/lib/studio-server';

const sent = (over: Partial<StudioInvoice> = {}): StudioInvoice => ({
  ...newInvoice(DEFAULT_PROFILE), status: 'sent', issueDate: '2026-01-10', dueDate: '2026-02-01',
  items: [newLineItem({ description: 'Mowing', quantity: 1, unitPrice: 100 })], taxRate: 10, ...over,
});

describe('brands', () => {
  it('seeds the current profile plus the three starter businesses once', () => {
    const x = ensureBrands(normalizeExtras(null), { ...DEFAULT_PROFILE, name: 'Collins Lawncare' });
    expect(x.brands.map((b) => b.profile.name)).toEqual(['Collins Lawncare', 'Front Porch Growth', 'Custom Gifts Online']);
    expect(x.activeBrandId).toBe(x.brands[0].id);
    expect(ensureBrands(x, DEFAULT_PROFILE)).toBe(x);
  });
});

describe('time & expenses', () => {
  const extras: StudioExtras = {
    ...DEFAULT_EXTRAS, brands: [], activeBrandId: '',
    time: [{ id: 't1', brandId: 'b1', date: '2026-03-02', description: 'Edging', hours: 2.5, rate: 40, clientId: '', invoiceId: '' }],
    expenses: [
      { id: 'e1', brandId: 'b1', date: '2026-03-02', description: 'Mulch', category: 'Materials', amount: 30, billable: true, invoiceId: '' },
      { id: 'e2', brandId: 'b1', date: '2026-03-03', description: 'Gas', category: 'Fuel', amount: 20, billable: false, invoiceId: '' },
    ],
  };
  it('bills unbilled work to an invoice and marks it billed', () => {
    const inv = newInvoice(DEFAULT_PROFILE);
    const open = unbilled(extras, 'b1');
    expect(open.expenses.map((e) => e.id)).toEqual(['e1']);
    const out = billToInvoice(inv, extras, open.expenses.map((e) => e.id), open.time.map((t) => t.id));
    expect(calcTotals({ ...out.invoice, taxRate: 0 }).subtotal).toBe(130);
    expect(unbilled(out.extras, 'b1')).toEqual({ expenses: [], time: [] });
    // Billing twice adds nothing.
    expect(billToInvoice(out.invoice, out.extras, ['e1'], ['t1']).invoice.items.length).toBe(out.invoice.items.length);
  });
  it('builds a tax summary with sales tax separated from income', () => {
    // amountPaid is the earlier deposit, separate from payments: a $50 deposit
    // plus a $110 payment is $160 collected, not $110.
    const inv = sent({ brandId: 'b1', payments: [{ id: 'p', date: '2026-04-15', amount: 110, method: 'Cash', reference: '' }], amountPaid: 50, status: 'paid' });
    const x = { ...extras, brands: [{ id: 'b1', profile: { ...DEFAULT_PROFILE, name: 'Collins Lawncare' } }] };
    const s = taxSummary([inv], x, 2026);
    expect(s.totals.collected).toBe(160);
    expect(s.totals.taxCollected).toBe(14.55);
    expect(s.totals.expenses).toBe(50);
    expect(s.totals.net).toBe(95.45);
    expect(s.quarters[1].collected).toBe(110);
    expect(s.quarters[0].collected).toBe(50);
    expect(s.quarters[0].taxCollected).toBe(4.55);
    expect(taxSummaryCSV(s)).toContain('Collins Lawncare');
  });
  it('counts a deposit-only invoice in its quarter, including sales tax', () => {
    const inv = sent({ brandId: 'b1', issueDate: '2026-02-10', payments: [], amountPaid: 40, status: 'sent' });
    const x = { ...extras, brands: [{ id: 'b1', profile: { ...DEFAULT_PROFILE, name: 'Collins Lawncare' } }] };
    const s = taxSummary([inv], x, 2026);
    expect(s.totals.collected).toBe(40);
    expect(s.totals.taxCollected).toBe(3.64);
    expect(s.quarters[0].collected).toBe(40);
    expect(s.quarters[0].taxCollected).toBe(3.64);
  });
});

describe('data-loss guards', () => {
  it('does not treat a normalized empty extras object as stored work', () => {
    expect(hasStoredExtras(normalizeExtras(null))).toBe(false);
    expect(hasStoredExtras(normalizeExtras(undefined))).toBe(false);
    expect(hasStoredExtras(normalizeExtras({ expenses: [{ id: 'e', brandId: '', date: '2026-01-01', description: '', category: 'Other', amount: 1, billable: true, invoiceId: '' }] }))).toBe(true);
  });
  it('releases work billed to invoices that were never saved, and keeps the rest', () => {
    const billed: StudioExtras = {
      ...DEFAULT_EXTRAS,
      expenses: [{ id: 'e1', brandId: 'b1', date: '2026-03-02', description: 'Mulch', category: 'Materials', amount: 30, billable: true, invoiceId: 'draft-1' }],
      time: [{ id: 't1', brandId: 'b1', date: '2026-03-02', description: 'Edging', hours: 1, rate: 40, clientId: '', invoiceId: 'saved-1' }],
    };
    const out = releaseBilledWork(billed, new Set(['saved-1']));
    expect(out.expenses[0].invoiceId).toBe('');
    expect(out.time[0].invoiceId).toBe('saved-1');
    expect(unbilled(out, 'b1').expenses.map((e) => e.id)).toEqual(['e1']);
    expect(releaseBilledWork(out, new Set(['saved-1']))).toBe(out); // no change → same reference
  });
  it('keeps the open draft brand id when re-seeding empty brands', () => {
    const x = ensureBrands({ ...DEFAULT_EXTRAS, activeBrandId: 'brand-keep' }, DEFAULT_PROFILE);
    expect(x.brands[0].id).toBe('brand-keep');
    expect(x.activeBrandId).toBe('brand-keep');
  });
});

describe('reminders and tracking', () => {
  it('schedules only the newest reached offset, once', () => {
    const inv = sent();
    expect(dueReminders([inv], '2026-01-31', [1, 7])).toEqual([]);
    const due = dueReminders([inv], '2026-02-09', [1, 7, 14]);
    expect(due.map((d) => d.offset)).toEqual([7]);
    expect(dueReminders([{ ...inv, remindersSent: ['overdue+7@2026-02-09'] }], '2026-02-10', [1, 7, 14])).toEqual([]);
    expect(dueReminders([{ ...inv, status: 'draft' }], '2026-03-01', [1])).toEqual([]);
    expect(nextReminderDate(inv, [1, 7, 14], '2026-02-05')).toBe('2026-02-08');
  });
  it('takes views from the server and unions reminder keys', () => {
    const client = sent({ remindersSent: ['a'] });
    const merged = mergeServerTracking(client, { ...client, views: ['2026-02-01T10:00:00Z'], remindersSent: ['b'] });
    expect(viewSummary(merged).count).toBe(1);
    expect(merged.remindersSent.sort()).toEqual(['a', 'b']);
  });
});

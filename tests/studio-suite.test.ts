import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ prisma: {} }));
import { DEFAULT_PROFILE, calcTotals, newInvoice, newLineItem, type StudioInvoice } from '@/lib/studio';
import {
  DEFAULT_EXTRAS, billToInvoice, dueReminders, ensureBrands, hasStoredExtras, nextReminderDate, normalizeExtras, taxSummary, taxSummaryCSV, unbilled, viewSummary,
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
  it('treats a normalized empty snapshot as having no stored extras', () => {
    expect(hasStoredExtras(normalizeExtras(null))).toBe(false);
    expect(hasStoredExtras(normalizeExtras({ reminderOffsets: [3] }))).toBe(false);
    expect(hasStoredExtras({ brands: [{ id: 'b', profile: DEFAULT_PROFILE }] })).toBe(true);
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
    const inv = sent({ brandId: 'b1', payments: [{ id: 'p', date: '2026-04-15', amount: 110, method: 'Cash', reference: '' }], amountPaid: 110, status: 'paid' });
    const x = { ...extras, brands: [{ id: 'b1', profile: { ...DEFAULT_PROFILE, name: 'Collins Lawncare' } }] };
    const s = taxSummary([inv], x, 2026);
    expect(s.totals.collected).toBe(110);
    expect(s.totals.taxCollected).toBe(10);
    expect(s.totals.expenses).toBe(50);
    expect(s.totals.net).toBe(50);
    expect(s.quarters[1].collected).toBe(110);
    expect(s.quarters[1].taxCollected).toBe(10);
    expect(taxSummaryCSV(s)).toContain('Collins Lawncare');
  });
  it('adds sales tax to the quarter for amountPaid deposits with no payments array', () => {
    const inv = sent({ brandId: 'b1', payments: [], amountPaid: 110, status: 'paid' });
    const x = { ...extras, brands: [{ id: 'b1', profile: { ...DEFAULT_PROFILE, name: 'Collins Lawncare' } }] };
    const s = taxSummary([inv], x, 2026);
    expect(s.totals.collected).toBe(110);
    expect(s.totals.taxCollected).toBe(10);
    expect(s.quarters[0].collected).toBe(110);
    expect(s.quarters[0].taxCollected).toBe(10);
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

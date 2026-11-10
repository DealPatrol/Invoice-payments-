import { describe, expect, it } from 'vitest';
import {
  assertCanConvert,
  kindLabel,
  normalizeLine,
  summarize,
  toInvoiceItems,
  transitionChangeOrder,
  transitionEstimate,
} from '@/lib/estimate-domain';

describe('estimate statuses', () => {
  it('sends, approves, and converts in order', () => {
    expect(transitionEstimate('draft', 'sent')).toBe('sent');
    expect(transitionEstimate('sent', 'approved')).toBe('approved');
    expect(transitionEstimate('approved', 'converted')).toBe('converted');
  });

  it('rejects skipping approval and reopening a converted estimate', () => {
    expect(() => transitionEstimate('draft', 'approved')).toThrow(/Cannot move/);
    expect(() => transitionEstimate('converted', 'draft')).toThrow(/Cannot move/);
    expect(() => assertCanConvert('sent', false)).toThrow(/Approve the estimate/);
    expect(() => assertCanConvert('approved', true)).toThrow(/already an invoice/);
  });

  it('lets a declined estimate return to draft and a change order become an invoice', () => {
    expect(transitionEstimate('declined', 'draft')).toBe('draft');
    expect(transitionEstimate('sent', 'declined')).toBe('declined');
    expect(transitionChangeOrder('draft', 'invoiced')).toBe('invoiced');
    expect(transitionChangeOrder('approved', 'invoiced')).toBe('invoiced');
    expect(() => transitionChangeOrder('declined', 'approved')).toThrow(/Cannot move/);
  });
});

describe('estimate to invoice lines', () => {
  it('prices lines, adds material shopping links, and maps them onto invoice items', () => {
    const labor = normalizeLine({ kind: 'labor', description: 'Set posts', quantity: 2, unit: 'hr', unitPrice: 68.125 }, 'a');
    const material = normalizeLine({ kind: 'materials', description: 'Cedar panels', quantity: 10, unit: 'panel', unitPrice: 92 }, 'b');
    expect(labor.total).toBe(136.25);
    expect(labor.shoppingUrl).toBeNull();
    expect(material.shoppingUrl).toContain('Cedar%20panels');
    expect(summarize([labor, material], 0.1)).toEqual({ subtotal: 1056.25, tax: 105.63, total: 1161.88, taxRate: 0.1 });
    expect(toInvoiceItems([labor, material])).toEqual([
      { description: 'Labor — Set posts', quantity: 2, unitRate: 68.13 },
      { description: 'Materials — Cedar panels', quantity: 10, unitRate: 92 },
    ]);
    expect(kindLabel('other')).toBe('Other');
  });

  it('refuses an invoice with no lines', () => {
    expect(() => toInvoiceItems([])).toThrow(/at least one line/);
  });
});

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

import { effectiveTier, linesForTier, summarize as summarizeTiers, tierTotals, toInvoiceItems as toItems } from '@/lib/estimate-domain';

describe('good / better / best', () => {
  const lines = [
    { id: 's', kind: 'labor' as const, description: 'Labor', quantity: 2, unit: 'hr', unitPrice: 100, total: 200, shoppingUrl: null, tier: '' as const },
    { id: 'g', kind: 'materials' as const, description: 'Basic unit', quantity: 1, unit: 'ea', unitPrice: 500, total: 500, shoppingUrl: null, tier: 'good' as const },
    { id: 'b', kind: 'materials' as const, description: 'Mid unit', quantity: 1, unit: 'ea', unitPrice: 800, total: 800, shoppingUrl: null, tier: 'better' as const },
    { id: 'x', kind: 'materials' as const, description: 'Top unit', quantity: 1, unit: 'ea', unitPrice: 1200, total: 1200, shoppingUrl: null, tier: 'best' as const },
  ];

  it('defaults to Better and totals shared + chosen lines', () => {
    expect(effectiveTier(lines)).toBe('better');
    expect(summarizeTiers(lines, 0).total).toBe(1000);
    expect(summarizeTiers(lines, 0.1, 'best').total).toBe(1540);
  });

  it('reports every option total', () => {
    expect(tierTotals(lines, 0)).toEqual({
      good: { subtotal: 700, tax: 0, total: 700 },
      better: { subtotal: 1000, tax: 0, total: 1000 },
      best: { subtotal: 1400, tax: 0, total: 1400 },
    });
  });

  it('invoices only the chosen option', () => {
    expect(linesForTier(lines, 'good').map((l) => l.id)).toEqual(['s', 'g']);
    expect(toItems(lines, 'best')).toHaveLength(2);
  });

  it('leaves estimates without options unchanged', () => {
    const plain = lines.map((l) => ({ ...l, tier: '' as const }));
    expect(effectiveTier(plain)).toBe('');
    expect(summarizeTiers(plain, 0).total).toBe(2700);
  });
});

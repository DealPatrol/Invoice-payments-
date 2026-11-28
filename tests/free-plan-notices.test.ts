import { describe, expect, it } from 'vitest';
import { createDoc, emptyDatabase, markSent, saveDoc } from '../mobile/src/lib/db';
import type { Database, Doc } from '../mobile/src/lib/types';
import { postSendNotice, preSendNotice } from '../mobile/src/lib/gate';
import { perMonthLabel, yearlySavingsPercent } from '../mobile/src/lib/pricing';
import { FALLBACK_PRICES, FALLBACK_PRICE_VALUES, PRO_MONTHLY_ID, PRO_YEARLY_ID } from '../mobile/src/lib/config';

function withInvoice(db: Database, lines = [{ quantity: 2, unitPrice: 50 }]): { db: Database; doc: Doc } {
  const r = createDoc(db, 'invoice', '2026-11-01');
  const doc: Doc = { ...r.doc, clientSnapshot: { name: 'Acme', email: '', phone: '', address: '' }, lines: lines.map((l, i) => ({ id: `l${i}`, name: `Item ${i}`, description: '', taxable: true, ...l })) };
  return { db: saveDoc(r.db, doc), doc };
}

describe('free-plan transparency (learned from competitor reviews: no surprise paywalls)', () => {
  const sendN = (n: number): Database => {
    let db = emptyDatabase();
    for (let i = 0; i < n; i++) {
      const w = withInvoice(db);
      db = markSent(w.db, w.doc.id);
    }
    return db;
  };

  it('warns before every free send and says when it is the last one', () => {
    const w = withInvoice(sendN(0));
    expect(preSendNotice(w.db, w.doc, false)).toMatch(/1 of your 3 remaining free invoice sends/);
    const w2 = withInvoice(sendN(2));
    expect(preSendNotice(w2.db, w2.doc, false)).toMatch(/last free invoice send/);
    const w3 = withInvoice(sendN(3));
    expect(preSendNotice(w3.db, w3.doc, false)).toMatch(/used your 3 free invoice sends/);
    expect(preSendNotice(w3.db, w3.doc, false)).toMatch(/draft/);
  });

  it('says nothing for Pro, estimates, or invoices that were already sent', () => {
    const w = withInvoice(sendN(3));
    expect(preSendNotice(w.db, w.doc, true)).toBe('');
    expect(preSendNotice(w.db, { id: 'x', kind: 'estimate' }, false)).toBe('');
    const sent = withInvoice(sendN(0));
    const db = markSent(sent.db, sent.doc.id);
    expect(preSendNotice(db, sent.doc, false)).toBe('');
  });

  it('announces the end of the free plan right after the 3rd send, and only then', () => {
    expect(postSendNotice(sendN(3), false, true)).toMatch(/last free invoice send/);
    expect(postSendNotice(sendN(2), false, true)).toBe('');
    expect(postSendNotice(sendN(3), true, true)).toBe('');
    expect(postSendNotice(sendN(3), false, false)).toBe('');
  });

  it('shows the yearly price per month and the real savings', () => {
    expect(perMonthLabel('$59.99', 59.99)).toBe('$5.00');
    expect(perMonthLabel('£47.99', 47.99)).toBe('£4.00');
    expect(yearlySavingsPercent(9.99, 59.99)).toBe(49); // 49.96% rounded down, never overstated
    expect(yearlySavingsPercent(9.99, 200)).toBe(0);
  });

  it('keeps the fixed product prices and a no-trial paywall', () => {
    expect(FALLBACK_PRICES[PRO_MONTHLY_ID]).toBe('$9.99');
    expect(FALLBACK_PRICES[PRO_YEARLY_ID]).toBe('$59.99');
    expect(FALLBACK_PRICE_VALUES[PRO_MONTHLY_ID]).toBe(9.99);
    expect(FALLBACK_PRICE_VALUES[PRO_YEARLY_ID]).toBe(59.99);
  });
});

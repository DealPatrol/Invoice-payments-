import { describe, expect, it } from 'vitest';
import { createDoc, emptyDatabase, markSent, recordPayment, saveDoc } from '../mobile/src/lib/db';
import { docTotals, displayStatus } from '../mobile/src/lib/calc';
import type { Database, Doc } from '../mobile/src/lib/types';
import { round2 } from '../mobile/src/lib/util';

function withInvoice(db: Database, lines = [{ quantity: 2, unitPrice: 50 }]): { db: Database; doc: Doc } {
  const r = createDoc(db, 'invoice', '2026-11-01');
  const doc: Doc = { ...r.doc, clientSnapshot: { name: 'Acme', email: '', phone: '', address: '' }, lines: lines.map((l, i) => ({ id: `l${i}`, name: `Item ${i}`, description: '', taxable: true, ...l })) };
  return { db: saveDoc(r.db, doc), doc };
}

describe('money math edge cases (competitor complaints: "2.5 hours shows 2.51", wrong paid status)', () => {
  it('does not drift on fractional hours or repeated cents', () => {
    const { doc } = withInvoice(emptyDatabase(), [{ quantity: 2.5, unitPrice: 40 }]);
    expect(docTotals(doc).total).toBe(100);
    const t = docTotals({ ...doc, lines: [0.1, 0.1, 0.1].map((p, i) => ({ id: `d${i}`, name: 'x', description: '', quantity: 1, unitPrice: p, taxable: true })) });
    expect(t.subtotal).toBe(0.3);
    expect(docTotals({ ...doc, lines: [{ id: 'a', name: 'x', description: '', quantity: 2.5, unitPrice: 19.99, taxable: true }] }).total).toBe(49.98);
  });

  it('tax applies only to taxable lines and rounds to cents', () => {
    const { doc } = withInvoice(emptyDatabase(), [{ quantity: 1, unitPrice: 100 }]);
    const lines = [
      { id: 'a', name: 'Labor', description: '', quantity: 1, unitPrice: 100, taxable: false },
      { id: 'b', name: 'Parts', description: '', quantity: 1, unitPrice: 33.33, taxable: true },
    ];
    const t = docTotals({ ...doc, lines, taxRate: 8.25 });
    expect(t.tax).toBe(2.75);
    expect(t.total).toBe(136.08);
  });

  it('partial payments show as partial, full payment as paid, and overpayment never goes negative', () => {
    let { db, doc } = withInvoice(emptyDatabase());
    db = markSent(db, doc.id);
    const r = recordPayment(db, doc.id, 40, 'Check');
    expect(displayStatus(r.db.docs[0], '2026-11-02')).toBe('partial');
    expect(docTotals(r.db.docs[0]).balance).toBe(60);
    const full = recordPayment(r.db, doc.id, 60, 'Check');
    expect(full.fullyPaid).toBe(true);
    expect(displayStatus(full.db.docs[0], '2027-01-01')).toBe('paid');
    const over = docTotals({ ...full.db.docs[0], payments: [...full.db.docs[0].payments, { id: 'o', amount: 25, date: '2026-11-03', method: 'x' }] });
    expect(over.balance).toBe(0);
  });
});

describe('round2', () => {
  it('rounds half cents up and negatives symmetrically, never returns -0 or NaN', () => {
    expect(round2(49.975)).toBe(49.98);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(Object.is(round2(-0.001), 0)).toBe(true);
    expect(round2(Number.NaN)).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createDoc, emptyDatabase, markSent, recordPayment, saveDoc } from '../mobile/src/lib/db';
import { canRemind, reminderText } from '../mobile/src/lib/reminder';
import type { Database, Doc } from '../mobile/src/lib/types';

function sentInvoice(overrides: Partial<Doc> = {}): { db: Database; doc: Doc } {
  const r = createDoc(emptyDatabase(), 'invoice', '2026-11-01');
  const doc: Doc = {
    ...r.doc,
    title: 'Water heater',
    dueDate: '2026-11-15',
    clientSnapshot: { name: 'Maria Lopez', email: '', phone: '', address: '' },
    lines: [{ id: 'l1', name: 'Labor', description: '', quantity: 2, unitPrice: 50, taxable: true }],
    ...overrides,
  };
  let db = saveDoc(r.db, doc);
  db = markSent(db, doc.id);
  return { db: { ...db, business: { ...db.business, name: 'Rivera Plumbing', phone: '555-0100', paymentLink: 'https://buy.stripe.com/test_abc' } }, doc: db.docs[0] };
}

describe('payment reminder (free; no new permissions, nothing is sent by the app)', () => {
  it('only offers a reminder for sent invoices that still owe money', () => {
    const { db, doc } = sentInvoice();
    expect(canRemind(doc, '2026-11-20')).toBe(true);
    const paid = recordPayment(db, doc.id, undefined, 'Check').db.docs[0];
    expect(canRemind(paid, '2026-11-20')).toBe(false);
    const draft = createDoc(emptyDatabase(), 'invoice').doc;
    expect(canRemind(draft)).toBe(false);
    const est = createDoc(emptyDatabase(), 'estimate').doc;
    expect(canRemind({ ...est, sentAt: '2026-11-01T00:00:00Z', status: 'sent' })).toBe(false);
  });

  it('writes a polite overdue message with balance, pay link and sign-off', () => {
    const { db, doc } = sentInvoice();
    const text = reminderText(doc, db.business, '2026-11-20');
    expect(text).toMatch(/^Hi Maria,/);
    expect(text).toMatch(/INV-0001 \(Water heater\)/);
    expect(text).toMatch(/due on Nov 15, 2026 \(5 days ago\)/);
    expect(text).toMatch(/Balance due: \$100\.00/);
    expect(text).toMatch(/Pay online: https:\/\/buy\.stripe\.com\/test_abc/);
    expect(text).toMatch(/Rivera Plumbing · 555-0100/);
  });

  it('mentions partial payments and handles due-today, upcoming and missing client name', () => {
    const { db, doc } = sentInvoice();
    const part = recordPayment(db, doc.id, 40, 'Check').db.docs[0];
    expect(reminderText(part, db.business, '2026-11-15')).toMatch(/It is due today\. We received \$40\.00 so far\./);
    expect(reminderText(part, db.business, '2026-11-15')).toMatch(/Balance due: \$60\.00/);
    expect(reminderText(doc, db.business, '2026-11-10')).toMatch(/It is due on Nov 15, 2026\./);
    const anon = { ...doc, clientSnapshot: null, paymentLink: '' };
    expect(reminderText(anon, { ...db.business, paymentLink: '' }, '2026-11-16')).toMatch(/^Hello,/);
    expect(reminderText(anon, { ...db.business, paymentLink: '' }, '2026-11-16')).not.toMatch(/Pay online/);
    expect(reminderText(anon, db.business, '2026-11-16')).toMatch(/1 day ago/);
  });
});

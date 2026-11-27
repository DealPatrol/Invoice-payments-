import { describe, expect, it } from 'vitest';
import { convertEstimate, createDoc, emptyDatabase, markSent, normalizeDatabase, recordPayment, rememberItems, saveDoc } from '../mobile/src/lib/db';
import { docTotals, displayStatus, summarize } from '../mobile/src/lib/calc';
import { FREE_INVOICE_SENDS, canSendDoc, freeSendsLeft, pdfFooter, shouldAskForReview } from '../mobile/src/lib/gate';
import { backupJson, documentsCsv, parseBackup, toCsv } from '../mobile/src/lib/exporters';
import { LocalStore, MIRROR_MAIN, MIRROR_PREV, createMemoryBackend, createMemoryMirror } from '../mobile/src/lib/storage';
import { buildDocPdf, pdfSafe } from '../mobile/src/lib/pdf';
import type { Database, Doc } from '../mobile/src/lib/types';

function withInvoice(db: Database, lines = [{ quantity: 2, unitPrice: 50 }]): { db: Database; doc: Doc } {
  const r = createDoc(db, 'invoice', '2026-11-01');
  const doc: Doc = { ...r.doc, clientSnapshot: { name: 'Acme', email: '', phone: '', address: '' }, lines: lines.map((l, i) => ({ id: `l${i}`, name: `Item ${i}`, description: '', taxable: true, ...l })) };
  return { db: saveDoc(r.db, doc), doc };
}

describe('totals', () => {
  it('applies discount before tax and computes balance after payments', () => {
    const { doc } = withInvoice(emptyDatabase(), [{ quantity: 2, unitPrice: 50 }]);
    const t = docTotals({ ...doc, taxRate: 10, discountType: 'percent', discountValue: 10, payments: [{ id: 'p', amount: 20, date: '2026-11-02', method: 'x' }] });
    expect(t.subtotal).toBe(100);
    expect(t.discount).toBe(10);
    expect(t.tax).toBe(9);
    expect(t.total).toBe(99);
    expect(t.balance).toBe(79);
  });

  it('flags overdue and summarizes outstanding money', () => {
    let { db, doc } = withInvoice(emptyDatabase());
    db = markSent(db, doc.id);
    const sent = db.docs.find((d) => d.id === doc.id)!;
    expect(displayStatus(sent, '2026-12-31')).toBe('overdue');
    expect(summarize(db.docs, '2026-12-31').overdue).toBe(100);
  });
});

describe('documents', () => {
  it('numbers invoices and estimates independently', () => {
    let db = emptyDatabase();
    db = createDoc(db, 'invoice').db;
    db = createDoc(db, 'invoice').db;
    const e = createDoc(db, 'estimate');
    expect(e.doc.number).toBe('EST-0001');
    expect(e.db.docs.map((d) => d.number)).toContain('INV-0002');
  });

  it('converts an estimate into a linked invoice with the same lines', () => {
    const r = createDoc(emptyDatabase(), 'estimate');
    const est: Doc = { ...r.doc, title: 'Deck', deposit: 200, lines: [{ id: 'a', name: 'Boards', description: '', quantity: 10, unitPrice: 30, taxable: true }] };
    const conv = convertEstimate(saveDoc(r.db, est), est.id)!;
    expect(conv.invoice.kind).toBe('invoice');
    expect(conv.invoice.linkedDocId).toBe(est.id);
    expect(conv.invoice.deposit).toBe(200);
    expect(docTotals(conv.invoice).subtotal).toBe(300);
    expect(conv.db.docs.find((d) => d.id === est.id)!.status).toBe('accepted');
    expect(convertEstimate(conv.db, est.id)!.invoice.id).toBe(conv.invoice.id);
  });

  it('marking paid counts once and drives the review prompt at the 1st and 3rd paid invoice', () => {
    const { db, doc } = withInvoice(emptyDatabase());
    const r = recordPayment(db, doc.id);
    expect(r.fullyPaid).toBe(true);
    expect(r.db.paidCount).toBe(1);
    expect(recordPayment(r.db, doc.id).db.paidCount).toBe(1);
    expect(shouldAskForReview(1, [])).toBe(true);
    expect(shouldAskForReview(1, [1])).toBe(false);
    expect(shouldAskForReview(2, [1])).toBe(false);
    expect(shouldAskForReview(3, [1])).toBe(true);
  });

  it('remembers line items for autofill', () => {
    const { db, doc } = withInvoice(emptyDatabase());
    const next = rememberItems(db, doc.lines);
    expect(next.items.map((i) => i.name)).toEqual(['Item 0']);
  });
});

describe('free plan gate', () => {
  it('allows 3 invoice sends, blocks the 4th new one, never blocks re-exporting past invoices', () => {
    let db = emptyDatabase();
    const ids: string[] = [];
    for (let i = 0; i < FREE_INVOICE_SENDS; i++) {
      const r = withInvoice(db);
      expect(canSendDoc(r.db, r.doc, false)).toBe(true);
      db = markSent(r.db, r.doc.id);
      ids.push(r.doc.id);
    }
    expect(freeSendsLeft(db)).toBe(0);
    const fourth = withInvoice(db);
    expect(canSendDoc(fourth.db, fourth.doc, false)).toBe(false);
    expect(canSendDoc(fourth.db, fourth.doc, true)).toBe(true);
    expect(canSendDoc(fourth.db, { id: ids[0], kind: 'invoice' }, false)).toBe(true);
    const est = createDoc(fourth.db, 'estimate');
    expect(canSendDoc(est.db, est.doc, false)).toBe(true);
  });

  it('free PDFs carry the footer; Pro removes it', () => {
    expect(pdfFooter(false)).toBe('Made with Invoice Jot · invoicejot.com');
    expect(pdfFooter(true)).toBeNull();
  });
});

describe('storage and backups', () => {
  it('never throws on garbage and keeps the app id', () => {
    expect(normalizeDatabase('nope').app).toBe('InvoiceJot');
    expect(normalizeDatabase({ docs: [{ nope: 1 }] }).docs.length).toBeGreaterThanOrEqual(0);
  });

  it('round-trips a JSON backup and rejects foreign files', () => {
    const { db } = withInvoice(emptyDatabase());
    const back = parseBackup(backupJson(db));
    expect(back.docs).toHaveLength(1);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not an Invoice Jot backup/);
    expect(() => parseBackup('nope')).toThrow();
  });

  it('writes an atomic mirror and recovers from it when IndexedDB is wiped', async () => {
    const kv = createMemoryBackend();
    const mirror = createMemoryMirror();
    const store = new LocalStore(kv, mirror);
    const { db } = withInvoice(emptyDatabase());
    await store.save(db);
    await store.save({ ...db, paidCount: 2 });
    expect(mirror.files.has(MIRROR_MAIN)).toBe(true);
    expect(mirror.files.has(MIRROR_PREV)).toBe(true);
    kv.data.clear();
    const fresh = await new LocalStore(kv, mirror).load();
    expect(fresh.source).toBe('mirror');
    expect(fresh.db.paidCount).toBe(2);
    expect(fresh.db.docs).toHaveLength(1);
  });

  it('exports CSV with escaping', () => {
    expect(toCsv([['a,b', 'say "hi"']])).toBe('"a,b","say ""hi"""\r\n');
    const { db } = withInvoice(emptyDatabase());
    expect(documentsCsv(db).split('\r\n')[1]).toContain('INV-0001');
  });
});

describe('pdf', () => {
  it('maps unsupported characters and builds a PDF with the free footer', () => {
    expect(pdfSafe('“Hi” — ok…')).toBe('"Hi" - ok...');
    const { db, doc } = withInvoice(emptyDatabase());
    const pdf = buildDocPdf({ doc, business: { ...db.business, name: 'Acme Plumbing' }, footer: pdfFooter(false) });
    const out = pdf.output();
    expect(out.startsWith('%PDF')).toBe(true);
    expect(out).toContain('/URI (https://invoicejot.com)');
    const proOut = buildDocPdf({ doc, business: db.business, footer: pdfFooter(true) }).output();
    expect(proOut).not.toContain('/URI (https://invoicejot.com)');
  });
});

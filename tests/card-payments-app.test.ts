import { describe, expect, it, vi } from 'vitest';
import { CARD_METHOD, applyCardStatus, cardApi, cardLinkIsCurrent, cardLinkToken, cardPaidOn, newPaymentRef, readPayLink, toMinor } from '../mobile/src/lib/cardPayments';
import { createDoc, emptyDatabase, recordPayment, saveDoc } from '../mobile/src/lib/db';
import { docTotals } from '../mobile/src/lib/calc';
import { createPayLink } from '@/lib/connect/service';
import type { ConnectConfig } from '@/lib/connect/config';
import type { Database, Doc } from '../mobile/src/lib/types';

const ACCT = 'acct_1TestAbcDEF123';
const cfg: ConnectConfig = { siteUrl: 'https://invoicejot.com', feeBps: 100, linkSecret: 'test-link-secret-0123456789abcdefghijklmnop', webhookSecret: null, allowedOrigins: [] };

function invoice(total = 150): { db: Database; doc: Doc } {
  const r = createDoc(emptyDatabase(), 'invoice', '2026-11-01');
  const doc: Doc = { ...r.doc, lines: [{ id: 'l1', name: 'Repair', description: '', quantity: 1, unitPrice: total, taxable: false }] };
  return { db: saveDoc(r.db, doc), doc };
}

function withLink(db: Database, doc: Doc, amount: number) {
  const link = createPayLink(cfg, ACCT, { amount, currency: 'USD', invoiceNumber: doc.number, ref: 'ij_0123456789abcdef' });
  const d2 = { ...doc, paymentLink: link.url };
  return { db: saveDoc(db, d2), doc: d2, link };
}

describe('card pay links on the phone', () => {
  it('recognises and reads a server-made link (same amount, no PII)', () => {
    const { db, doc } = invoice(150);
    const { doc: d2, link } = withLink(db, doc, 150);
    expect(cardLinkToken(d2.paymentLink)).toBe(link.token);
    expect(readPayLink(d2.paymentLink)).toMatchObject({ accountId: ACCT, amountMinor: 15000, currency: 'USD', invoiceNumber: doc.number, ref: 'ij_0123456789abcdef' });
    expect(cardLinkToken('https://buy.stripe.com/abc')).toBeNull();
    expect(readPayLink('https://paypal.me/me')).toBeNull();
  });

  it('a pasted link keeps working: users can still use their own payment link', () => {
    const { doc } = invoice();
    expect(cardLinkIsCurrent({ ...doc, paymentLink: 'https://paypal.me/rivera' }, 'USD', { accountId: ACCT })).toBe(false);
  });

  it('flags a stale link when the amount owed changes (but not after a card payment)', () => {
    const base = invoice(150);
    const { db, doc } = withLink(base.db, base.doc, 150);
    expect(cardLinkIsCurrent(doc, 'USD', { accountId: ACCT })).toBe(true);
    expect(cardLinkIsCurrent({ ...doc, lines: [{ ...doc.lines[0], unitPrice: 200 }] }, 'USD', { accountId: ACCT })).toBe(false);
    expect(cardLinkIsCurrent(doc, 'USD', { accountId: 'acct_1Somebodyelse' })).toBe(false);
    // A card payment recorded by "Check payment" does not make the link stale (the server charges only the rest).
    const afterCard = applyCardStatus(db, doc.id, 50, '2026-11-05T10:00:00Z').db.docs.find((d) => d.id === doc.id)!;
    expect(cardLinkIsCurrent(afterCard, 'USD', { accountId: ACCT })).toBe(true);
    // A manual cash payment does.
    const afterCash = recordPayment(db, doc.id, 50, 'Cash').db.docs.find((d) => d.id === doc.id)!;
    expect(cardLinkIsCurrent(afterCash, 'USD', { accountId: ACCT })).toBe(false);
  });

  it('marks paid from Stripe status idempotently', () => {
    const base = invoice(150);
    const { db, doc } = withLink(base.db, base.doc, 150);
    const r1 = applyCardStatus(db, doc.id, 150, '2026-11-05T10:00:00Z');
    expect(r1).toMatchObject({ added: 150, fullyPaid: true });
    const paid = r1.db.docs.find((d) => d.id === doc.id)!;
    expect(paid.status).toBe('paid');
    expect(paid.payments).toEqual([expect.objectContaining({ amount: 150, method: CARD_METHOD, date: '2026-11-05' })]);
    expect(docTotals(paid).balance).toBe(0);
    const r2 = applyCardStatus(r1.db, doc.id, 150, '2026-11-05T10:00:00Z');
    expect(r2.added).toBe(0);
    expect(r2.db).toBe(r1.db);
    // Partial then rest.
    const p1 = applyCardStatus(db, doc.id, 40, null);
    expect(p1).toMatchObject({ added: 40, fullyPaid: false });
    expect(cardPaidOn(p1.db.docs.find((d) => d.id === doc.id)!)).toBe(40);
    expect(applyCardStatus(p1.db, doc.id, 150, null)).toMatchObject({ added: 110, fullyPaid: true });
    // Never records more than is owed.
    expect(applyCardStatus(r1.db, doc.id, 500, null).added).toBe(0);
  });

  it('helpers', () => {
    expect(toMinor(19.99, 'USD')).toBe(1999);
    expect(toMinor(5000, 'JPY')).toBe(5000);
    expect(newPaymentRef()).toMatch(/^ij_[0-9a-f]{24}$/);
    expect(newPaymentRef()).not.toBe(newPaymentRef());
  });
});

describe('cardApi client', () => {
  it('posts JSON to invoicejot.com and surfaces server errors', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ state: 'active', feeLabel: '1%' }), { status: 200 }));
    const api = cardApi(f);
    expect(await api.status({ accountId: ACCT, accountKey: 'k' })).toMatchObject({ state: 'active' });
    expect(f.mock.calls[0][0]).toBe('https://invoicejot.com/api/connect/status');
    expect(JSON.parse(String(f.mock.calls[0][1]?.body))).toEqual({ accountId: ACCT, accountKey: 'k' });

    const bad = cardApi(async () => new Response(JSON.stringify({ error: 'Nope', code: 'bad_account_key' }), { status: 401 }));
    await expect(bad.status({ accountId: ACCT, accountKey: 'k' })).rejects.toMatchObject({ message: 'Nope', code: 'bad_account_key', status: 401 });
  });
  it('explains offline clearly (the rest of the app works offline)', async () => {
    const off = cardApi(async () => {
      throw new TypeError('Load failed');
    });
    await expect(off.createAccount('us', 'USD')).rejects.toMatchObject({ code: 'offline' });
  });
  it('never sends client details when making a pay link', async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }));
    await cardApi(f).payLink({ accountId: ACCT, accountKey: 'k' }, { amount: 10, currency: 'USD', invoiceNumber: 'INV-0001', ref: 'ij_0123456789abcdef' });
    expect(Object.keys(JSON.parse(String(f.mock.calls[0][1]?.body))).sort()).toEqual(['accountId', 'accountKey', 'amount', 'currency', 'invoiceNumber', 'ref']);
  });
});

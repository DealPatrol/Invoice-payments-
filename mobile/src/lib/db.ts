import type { Business, Client, Database, Doc, DocKind, LineItem, Payment, Receipt, SavedItem } from './types';
import { addDays, num, round2, str, todayISO, uid } from './util';
import { docTotals } from './calc';

export const DEFAULT_BUSINESS: Business = {
  name: '',
  owner: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  taxId: '',
  logo: '',
  paymentLink: '',
  paymentInstructions: '',
  currency: 'USD',
  defaultTaxRate: 0,
  defaultTermsDays: 14,
  defaultNotes: 'Thank you for your business!',
  pdfStyle: 'modern',
  accent: '#1f6f5c',
};

export function emptyDatabase(now = new Date().toISOString()): Database {
  return {
    app: 'InvoiceJot',
    version: 1,
    updatedAt: now,
    business: { ...DEFAULT_BUSINESS },
    clients: [],
    items: [],
    docs: [],
    receipts: [],
    counters: { invoice: 0, estimate: 0 },
    sentInvoiceIds: [],
    paidCount: 0,
    onboarded: false,
  };
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

function normLine(v: unknown): LineItem {
  const o = obj(v);
  return { id: str(o.id) || uid('li_'), name: str(o.name), description: str(o.description), quantity: num(o.quantity, 1), unitPrice: num(o.unitPrice), taxable: o.taxable !== false };
}

function normDoc(v: unknown): Doc | null {
  const o = obj(v);
  if (!str(o.id)) return null;
  const kind: DocKind = o.kind === 'estimate' ? 'estimate' : 'invoice';
  const status = ['draft', 'sent', 'accepted', 'declined', 'paid'].includes(str(o.status)) ? (o.status as Doc['status']) : 'draft';
  const cs = o.clientSnapshot ? obj(o.clientSnapshot) : null;
  return {
    id: str(o.id),
    kind,
    number: str(o.number),
    status,
    title: str(o.title),
    clientId: str(o.clientId) || null,
    clientSnapshot: cs ? { name: str(cs.name), email: str(cs.email), phone: str(cs.phone), address: str(cs.address) } : null,
    issueDate: str(o.issueDate) || todayISO(),
    dueDate: str(o.dueDate),
    lines: arr(o.lines).map(normLine),
    taxRate: num(o.taxRate),
    discountType: o.discountType === 'amount' ? 'amount' : 'percent',
    discountValue: num(o.discountValue),
    deposit: num(o.deposit),
    payments: arr(o.payments).map((p) => {
      const po = obj(p);
      return { id: str(po.id) || uid('pay_'), amount: num(po.amount), date: str(po.date) || todayISO(), method: str(po.method) };
    }),
    notes: str(o.notes),
    terms: str(o.terms),
    paymentLink: str(o.paymentLink),
    linkedDocId: str(o.linkedDocId) || null,
    sentAt: str(o.sentAt) || null,
    paidAt: str(o.paidAt) || null,
    createdAt: str(o.createdAt) || new Date().toISOString(),
    updatedAt: str(o.updatedAt) || new Date().toISOString(),
  };
}

/** Accepts anything (old snapshot, partial backup, garbage) and returns a valid Database. Never throws. */
export function normalizeDatabase(raw: unknown): Database {
  const base = emptyDatabase();
  const o = obj(raw);
  if (!Object.keys(o).length) return base;
  const b = obj(o.business);
  const business: Business = { ...DEFAULT_BUSINESS };
  for (const k of Object.keys(DEFAULT_BUSINESS) as (keyof Business)[]) {
    const dv = DEFAULT_BUSINESS[k];
    if (typeof dv === 'number') (business as unknown as Record<string, unknown>)[k] = num(b[k], dv);
    else if (typeof b[k] === 'string') (business as unknown as Record<string, unknown>)[k] = b[k];
  }
  if (!['classic', 'modern', 'bold'].includes(business.pdfStyle)) business.pdfStyle = 'modern';
  const docs = arr(o.docs).map(normDoc).filter((d): d is Doc => !!d);
  const counters = obj(o.counters);
  return {
    app: 'InvoiceJot',
    version: 1,
    updatedAt: str(o.updatedAt) || base.updatedAt,
    business,
    clients: arr(o.clients)
      .map((c) => obj(c))
      .filter((c) => str(c.id))
      .map((c) => ({ id: str(c.id), name: str(c.name), email: str(c.email), phone: str(c.phone), address: str(c.address), createdAt: str(c.createdAt) || base.updatedAt, updatedAt: str(c.updatedAt) || base.updatedAt })),
    items: arr(o.items)
      .map((c) => obj(c))
      .filter((c) => str(c.id))
      .map((c) => ({ id: str(c.id), name: str(c.name), description: str(c.description), unitPrice: num(c.unitPrice), unit: str(c.unit), taxable: c.taxable !== false, updatedAt: str(c.updatedAt) || base.updatedAt })),
    docs,
    receipts: arr(o.receipts)
      .map((c) => obj(c))
      .filter((c) => str(c.id))
      .map((c) => ({ id: str(c.id), vendor: str(c.vendor), amount: num(c.amount), date: str(c.date) || todayISO(), category: str(c.category), note: str(c.note), photo: str(c.photo), docId: str(c.docId) || null, createdAt: str(c.createdAt) || base.updatedAt })),
    counters: {
      invoice: Math.max(num(counters.invoice), docs.filter((d) => d.kind === 'invoice').length),
      estimate: Math.max(num(counters.estimate), docs.filter((d) => d.kind === 'estimate').length),
    },
    sentInvoiceIds: arr(o.sentInvoiceIds).filter((x): x is string => typeof x === 'string'),
    paidCount: num(o.paidCount),
    onboarded: o.onboarded === true,
  };
}

export function isEmptyDatabase(db: Database): boolean {
  return !db.docs.length && !db.clients.length && !db.items.length && !db.receipts.length && !db.business.name;
}

export function formatNumber(kind: DocKind, n: number): string {
  return `${kind === 'invoice' ? 'INV' : 'EST'}-${String(n).padStart(4, '0')}`;
}

/** Creates a draft. Numbers are reserved immediately so two drafts never share a number. */
export function createDoc(db: Database, kind: DocKind, today = todayISO()): { db: Database; doc: Doc } {
  const n = db.counters[kind] + 1;
  const now = new Date().toISOString();
  const doc: Doc = {
    id: uid(kind === 'invoice' ? 'inv_' : 'est_'),
    kind,
    number: formatNumber(kind, n),
    status: 'draft',
    title: '',
    clientId: null,
    clientSnapshot: null,
    issueDate: today,
    dueDate: kind === 'invoice' ? addDays(today, db.business.defaultTermsDays) : addDays(today, 30),
    lines: [],
    taxRate: db.business.defaultTaxRate,
    discountType: 'percent',
    discountValue: 0,
    deposit: 0,
    payments: [],
    notes: db.business.defaultNotes,
    terms: '',
    paymentLink: '',
    linkedDocId: null,
    sentAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { db: { ...db, counters: { ...db.counters, [kind]: n }, docs: [doc, ...db.docs] }, doc };
}

export function saveDoc(db: Database, doc: Doc): Database {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  const exists = db.docs.some((d) => d.id === doc.id);
  return { ...db, docs: exists ? db.docs.map((d) => (d.id === doc.id ? next : d)) : [next, ...db.docs] };
}

export function deleteDoc(db: Database, id: string): Database {
  return { ...db, docs: db.docs.filter((d) => d.id !== id).map((d) => (d.linkedDocId === id ? { ...d, linkedDocId: null } : d)) };
}

/** One tap: the estimate's title, client, lines, tax, discount and deposit carry over to a new invoice draft. */
export function convertEstimate(db: Database, estimateId: string, today = todayISO()): { db: Database; invoice: Doc } | null {
  const est = db.docs.find((d) => d.id === estimateId && d.kind === 'estimate');
  if (!est) return null;
  if (est.linkedDocId) {
    const existing = db.docs.find((d) => d.id === est.linkedDocId);
    if (existing) return { db, invoice: existing };
  }
  const created = createDoc(db, 'invoice', today);
  const invoice: Doc = {
    ...created.doc,
    title: est.title,
    clientId: est.clientId,
    clientSnapshot: est.clientSnapshot,
    lines: est.lines.map((l) => ({ ...l, id: uid('li_') })),
    taxRate: est.taxRate,
    discountType: est.discountType,
    discountValue: est.discountValue,
    deposit: est.deposit,
    notes: est.notes,
    terms: est.terms,
    paymentLink: est.paymentLink,
    linkedDocId: est.id,
  };
  let next = saveDoc(created.db, invoice);
  next = saveDoc(next, { ...est, status: 'accepted', linkedDocId: invoice.id });
  return { db: next, invoice: next.docs.find((d) => d.id === invoice.id) as Doc };
}

export function duplicateDoc(db: Database, id: string, today = todayISO()): { db: Database; doc: Doc } | null {
  const src = db.docs.find((d) => d.id === id);
  if (!src) return null;
  const created = createDoc(db, src.kind, today);
  const copy: Doc = { ...created.doc, title: src.title, clientId: src.clientId, clientSnapshot: src.clientSnapshot, lines: src.lines.map((l) => ({ ...l, id: uid('li_') })), taxRate: src.taxRate, discountType: src.discountType, discountValue: src.discountValue, deposit: src.deposit, notes: src.notes, terms: src.terms, paymentLink: src.paymentLink };
  return { db: saveDoc(created.db, copy), doc: copy };
}

export function markSent(db: Database, id: string): Database {
  const d = db.docs.find((x) => x.id === id);
  if (!d) return db;
  const status = d.status === 'draft' ? 'sent' : d.status;
  let next = saveDoc(db, { ...d, status, sentAt: d.sentAt ?? new Date().toISOString() });
  if (d.kind === 'invoice' && !db.sentInvoiceIds.includes(id)) next = { ...next, sentInvoiceIds: [...next.sentInvoiceIds, id] };
  return next;
}

/** Records a payment for the remaining balance (or a given amount). Returns whether the invoice is now fully paid. */
export function recordPayment(db: Database, id: string, amount?: number, method = 'Other', date = todayISO()): { db: Database; fullyPaid: boolean } {
  const d = db.docs.find((x) => x.id === id && x.kind === 'invoice');
  if (!d) return { db, fullyPaid: false };
  const t = docTotals(d);
  const amt = round2(amount ?? t.balance);
  if (amt <= 0) return { db, fullyPaid: d.status === 'paid' };
  const payment: Payment = { id: uid('pay_'), amount: amt, date, method };
  const updated: Doc = { ...d, payments: [...d.payments, payment] };
  const fullyPaid = docTotals(updated).balance <= 0;
  const wasPaid = d.status === 'paid';
  const final: Doc = fullyPaid ? { ...updated, status: 'paid', paidAt: new Date().toISOString(), sentAt: d.sentAt } : { ...updated, status: d.status === 'draft' ? 'sent' : d.status };
  const next = saveDoc(db, final);
  return { db: fullyPaid && !wasPaid ? { ...next, paidCount: next.paidCount + 1 } : next, fullyPaid };
}

export function upsertClient(db: Database, c: Partial<Client> & { name: string }): { db: Database; client: Client } {
  const now = new Date().toISOString();
  const existing = c.id ? db.clients.find((x) => x.id === c.id) : undefined;
  const client: Client = { id: existing?.id ?? uid('cl_'), name: c.name.trim(), email: c.email ?? existing?.email ?? '', phone: c.phone ?? existing?.phone ?? '', address: c.address ?? existing?.address ?? '', createdAt: existing?.createdAt ?? now, updatedAt: now };
  const clients = existing ? db.clients.map((x) => (x.id === client.id ? client : x)) : [client, ...db.clients];
  return { db: { ...db, clients }, client };
}

export function deleteClient(db: Database, id: string): Database {
  return { ...db, clients: db.clients.filter((c) => c.id !== id), docs: db.docs.map((d) => (d.clientId === id ? { ...d, clientId: null } : d)) };
}

/** Save every named line item into the item library so it autofills next time (latest price wins). */
export function rememberItems(db: Database, lines: LineItem[]): Database {
  let items = [...db.items];
  const now = new Date().toISOString();
  for (const l of lines) {
    const name = l.name.trim();
    if (!name) continue;
    const idx = items.findIndex((i) => i.name.toLowerCase() === name.toLowerCase());
    const item: SavedItem = { id: idx >= 0 ? items[idx].id : uid('it_'), name, description: l.description, unitPrice: l.unitPrice, unit: idx >= 0 ? items[idx].unit : '', taxable: l.taxable, updatedAt: now };
    if (idx >= 0) items[idx] = item;
    else items = [item, ...items];
  }
  return { ...db, items };
}

export function upsertItem(db: Database, it: Partial<SavedItem> & { name: string }): Database {
  const now = new Date().toISOString();
  const existing = it.id ? db.items.find((x) => x.id === it.id) : undefined;
  const item: SavedItem = { id: existing?.id ?? uid('it_'), name: it.name.trim(), description: it.description ?? existing?.description ?? '', unitPrice: num(it.unitPrice ?? existing?.unitPrice), unit: it.unit ?? existing?.unit ?? '', taxable: it.taxable ?? existing?.taxable ?? true, updatedAt: now };
  return { ...db, items: existing ? db.items.map((x) => (x.id === item.id ? item : x)) : [item, ...db.items] };
}

export function deleteItem(db: Database, id: string): Database {
  return { ...db, items: db.items.filter((i) => i.id !== id) };
}

export function upsertReceipt(db: Database, r: Partial<Receipt>): Database {
  const existing = r.id ? db.receipts.find((x) => x.id === r.id) : undefined;
  const receipt: Receipt = { id: existing?.id ?? uid('rc_'), vendor: r.vendor ?? existing?.vendor ?? '', amount: num(r.amount ?? existing?.amount), date: r.date ?? existing?.date ?? todayISO(), category: r.category ?? existing?.category ?? '', note: r.note ?? existing?.note ?? '', photo: r.photo ?? existing?.photo ?? '', docId: r.docId ?? existing?.docId ?? null, createdAt: existing?.createdAt ?? new Date().toISOString() };
  return { ...db, receipts: existing ? db.receipts.map((x) => (x.id === receipt.id ? receipt : x)) : [receipt, ...db.receipts] };
}

export function deleteReceipt(db: Database, id: string): Database {
  return { ...db, receipts: db.receipts.filter((r) => r.id !== id) };
}

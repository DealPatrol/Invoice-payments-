import type { Doc, LineItem } from './types';
import { round2, todayISO } from './util';

export function lineTotal(l: Pick<LineItem, 'quantity' | 'unitPrice'>): number {
  return round2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0));
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
  paid: number;
  deposit: number;
  balance: number;
}

/** Discount is applied before tax, proportionally across taxable and non-taxable lines. */
export function docTotals(doc: Pick<Doc, 'lines' | 'taxRate' | 'discountType' | 'discountValue' | 'deposit' | 'payments'>): Totals {
  const subtotal = round2(doc.lines.reduce((s, l) => s + lineTotal(l), 0));
  const taxableBase = round2(doc.lines.filter((l) => l.taxable).reduce((s, l) => s + lineTotal(l), 0));
  const rawDiscount = doc.discountType === 'percent' ? (subtotal * Math.max(0, doc.discountValue)) / 100 : Math.max(0, doc.discountValue);
  const discount = round2(Math.min(subtotal, rawDiscount));
  const ratio = subtotal > 0 ? (subtotal - discount) / subtotal : 0;
  const taxable = round2(taxableBase * ratio);
  const tax = round2((taxable * Math.max(0, doc.taxRate)) / 100);
  const total = round2(subtotal - discount + tax);
  const paid = round2(doc.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const deposit = round2(Math.min(Math.max(0, doc.deposit || 0), total));
  const balance = round2(Math.max(0, total - paid));
  return { subtotal, discount, taxable, tax, total, paid, deposit, balance };
}

export type DisplayStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'partial' | 'accepted' | 'declined';

export function displayStatus(doc: Doc, today: string = todayISO()): DisplayStatus {
  if (doc.kind === 'estimate') {
    if (doc.status === 'accepted' || doc.status === 'declined') return doc.status;
    return doc.status === 'draft' ? 'draft' : 'sent';
  }
  if (doc.status === 'paid') return 'paid';
  const t = docTotals(doc);
  if (t.total > 0 && t.balance <= 0) return 'paid';
  if (doc.status === 'draft') return 'draft';
  if (doc.dueDate && doc.dueDate < today) return 'overdue';
  if (t.paid > 0) return 'partial';
  return 'sent';
}

export interface Summary {
  outstanding: number;
  overdue: number;
  overdueCount: number;
  paidThisMonth: number;
  drafts: number;
  openEstimates: number;
}

export function summarize(docs: Doc[], today: string = todayISO()): Summary {
  const month = today.slice(0, 7);
  const s: Summary = { outstanding: 0, overdue: 0, overdueCount: 0, paidThisMonth: 0, drafts: 0, openEstimates: 0 };
  for (const d of docs) {
    const st = displayStatus(d, today);
    if (d.kind === 'estimate') {
      if (st === 'sent') s.openEstimates += 1;
      if (st === 'draft') s.drafts += 1;
      continue;
    }
    const t = docTotals(d);
    if (st === 'draft') s.drafts += 1;
    if (st === 'sent' || st === 'partial' || st === 'overdue') s.outstanding += t.balance;
    if (st === 'overdue') {
      s.overdue += t.balance;
      s.overdueCount += 1;
    }
    for (const p of d.payments) if (p.date.slice(0, 7) === month) s.paidThisMonth += Number(p.amount) || 0;
  }
  s.outstanding = round2(s.outstanding);
  s.overdue = round2(s.overdue);
  s.paidThisMonth = round2(s.paidThisMonth);
  return s;
}

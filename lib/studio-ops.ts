/**
 * Business logic for Invoice Studio: statuses, estimates → invoices, recurring
 * schedules, payments, dashboard metrics, reminder drafts, and CSV export.
 * Pure functions only (no storage, no network) so they are easy to test.
 */
import {
  addDays, calcTotals, formatDate, formatInvoiceNumber, formatMoney, newInvoice, termsLabel, uid,
  type BusinessProfile, type DisplayStatus, type RecurringInterval, type StudioInvoice, type StudioPayment,
} from './studio';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function displayStatus(inv: StudioInvoice, today: string): DisplayStatus {
  if (inv.kind === 'estimate') {
    if (inv.estimateStatus === 'sent' && inv.dueDate && inv.dueDate < today) return 'expired';
    return inv.estimateStatus;
  }
  if (inv.status === 'void') return 'void';
  const t = calcTotals(inv);
  if (inv.status === 'paid' || (t.total > 0 && t.balanceDue <= 0)) return 'paid';
  if (inv.status === 'draft') return 'draft';
  if (inv.dueDate && inv.dueDate < today) return 'overdue';
  if (t.amountPaid > 0) return 'partial';
  return 'sent';
}

export const STATUS_STYLES: Record<DisplayStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#8892b0' },
  sent: { label: 'Sent', color: '#4f6ef7' },
  partial: { label: 'Partially paid', color: '#f5a623' },
  paid: { label: 'Paid', color: '#22c97a' },
  overdue: { label: 'Overdue', color: '#f7524f' },
  void: { label: 'Void', color: '#6b7280' },
  accepted: { label: 'Accepted', color: '#22c97a' },
  declined: { label: 'Declined', color: '#f7524f' },
  converted: { label: 'Invoiced', color: '#a78bfa' },
  expired: { label: 'Expired', color: '#f5a623' },
};

/* ---------- payments ---------- */

export function recordPayment(inv: StudioInvoice, payment: Omit<StudioPayment, 'id'>): StudioInvoice {
  const amount = round2(Number(payment.amount) || 0);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');
  const payments = [...inv.payments, { ...payment, amount, id: uid() }];
  const next = { ...inv, payments, updatedAt: new Date().toISOString() };
  const t = calcTotals(next);
  return { ...next, status: t.balanceDue <= 0 ? 'paid' : inv.status === 'draft' ? 'sent' : inv.status };
}

export function removePayment(inv: StudioInvoice, paymentId: string): StudioInvoice {
  const payments = inv.payments.filter((p) => p.id !== paymentId);
  const next = { ...inv, payments };
  const t = calcTotals(next);
  return { ...next, status: inv.status === 'paid' && t.balanceDue > 0 ? 'sent' : inv.status };
}

/* ---------- estimates ---------- */

export function convertEstimate(est: StudioInvoice, profile: BusinessProfile, today: string): StudioInvoice {
  if (est.kind !== 'estimate') throw new Error('Only estimates can be converted');
  const base = newInvoice(profile, 'invoice', today);
  return {
    ...est,
    id: base.id,
    kind: 'invoice',
    number: base.number,
    status: 'draft',
    estimateStatus: 'converted',
    issueDate: today,
    termsDays: profile.defaultTermsDays,
    dueDate: addDays(today, profile.defaultTermsDays),
    payments: [],
    recurring: null,
    convertedFromId: est.id,
    convertedToId: '',
    sentAt: '',
    remindersSent: [],
    business: { ...profile },
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
}

/* ---------- recurring ---------- */

export function advanceDate(iso: string, interval: RecurringInterval): string {
  const [y, m, d] = iso.split('-').map(Number);
  switch (interval) {
    case 'weekly': return addDays(iso, 7);
    case 'biweekly': return addDays(iso, 14);
    default: {
      const months = interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : 12;
      const targetMonth = m - 1 + months;
      const lastDay = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
      return new Date(Date.UTC(y, targetMonth, Math.min(d, lastDay))).toISOString().slice(0, 10);
    }
  }
}

/**
 * Create every invoice a recurring template owes up to `today`.
 * Returns new invoices, updated templates, and the profile with bumped numbering.
 */
export function generateDueRecurring(
  invoices: StudioInvoice[], profile: BusinessProfile, today: string,
): { created: StudioInvoice[]; invoices: StudioInvoice[]; profile: BusinessProfile } {
  let p = { ...profile };
  const created: StudioInvoice[] = [];
  const updated = invoices.map((tpl) => {
    const rule = tpl.recurring;
    if (tpl.kind !== 'invoice' || !rule?.active || !rule.nextDate) return tpl;
    let next = rule.nextDate;
    let guard = 0;
    while (next <= today && (!rule.endDate || next <= rule.endDate) && guard++ < 60) {
      const number = formatInvoiceNumber(p.invoicePrefix, p.nextNumber);
      p = { ...p, nextNumber: p.nextNumber + 1 };
      created.push({
        ...tpl,
        id: uid(),
        number,
        status: 'draft',
        issueDate: next,
        dueDate: addDays(next, tpl.termsDays),
        payments: [],
        amountPaid: 0,
        recurring: null,
        convertedFromId: tpl.id,
        sentAt: '',
        remindersSent: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      next = advanceDate(next, rule.interval);
    }
    if (next === rule.nextDate) return tpl;
    const ended = Boolean(rule.endDate && next > rule.endDate);
    return { ...tpl, recurring: { ...rule, nextDate: next, active: !ended } };
  });
  return { created, invoices: [...created, ...updated], profile: p };
}

/* ---------- dashboard ---------- */

export interface StudioStats {
  outstanding: number;
  overdue: number;
  overdueCount: number;
  paidTotal: number;
  paidThisMonth: number;
  draftCount: number;
  openEstimates: number;
  openEstimatesValue: number;
  invoiceCount: number;
  avgDaysToPay: number | null;
}

export function dashboardStats(invoices: StudioInvoice[], today: string): StudioStats {
  const month = today.slice(0, 7);
  const s: StudioStats = {
    outstanding: 0, overdue: 0, overdueCount: 0, paidTotal: 0, paidThisMonth: 0, draftCount: 0,
    openEstimates: 0, openEstimatesValue: 0, invoiceCount: 0, avgDaysToPay: null,
  };
  const payDays: number[] = [];
  for (const inv of invoices) {
    const t = calcTotals(inv);
    const st = displayStatus(inv, today);
    if (inv.kind === 'estimate') {
      if (st === 'draft' || st === 'sent' || st === 'accepted') { s.openEstimates++; s.openEstimatesValue += t.total; }
      continue;
    }
    if (st === 'void') continue;
    s.invoiceCount++;
    if (st === 'draft') { s.draftCount++; continue; }
    for (const p of inv.payments) {
      s.paidTotal += p.amount;
      if (p.date.startsWith(month)) s.paidThisMonth += p.amount;
    }
    if (inv.amountPaid) s.paidTotal += inv.amountPaid;
    if (st === 'paid' && inv.payments.length === 0 && !inv.amountPaid) s.paidTotal += t.total; // marked paid manually
    if (st === 'paid' && inv.payments.length) {
      const last = inv.payments.reduce((a, b) => (a.date > b.date ? a : b));
      payDays.push(Math.max(0, daysBetween(inv.issueDate, last.date)));
    }
    if (st !== 'paid' && t.balanceDue > 0) {
      s.outstanding += t.balanceDue;
      if (st === 'overdue') { s.overdue += t.balanceDue; s.overdueCount++; }
    }
  }
  if (payDays.length) s.avgDaysToPay = Math.round(payDays.reduce((a, b) => a + b, 0) / payDays.length);
  for (const k of ['outstanding', 'overdue', 'paidTotal', 'paidThisMonth', 'openEstimatesValue'] as const) s[k] = round2(s[k]);
  return s;
}

/** Billed (by issue date) and collected (by payment date) for the last `months` months. */
export function monthlyRevenue(invoices: StudioInvoice[], today: string, months = 6) {
  const [y, m] = today.split('-').map(Number);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(d.toISOString().slice(0, 7));
  }
  const rows = keys.map((key) => ({ month: key, billed: 0, collected: 0 }));
  const idx = (iso: string) => keys.indexOf(iso.slice(0, 7));
  for (const inv of invoices) {
    if (inv.kind !== 'invoice' || inv.status === 'void' || inv.status === 'draft') continue;
    const t = calcTotals(inv);
    const bi = idx(inv.issueDate);
    if (bi >= 0) rows[bi].billed += t.total;
    for (const p of inv.payments) {
      const pi = idx(p.date);
      if (pi >= 0) rows[pi].collected += p.amount;
    }
    if (inv.status === 'paid' && inv.payments.length === 0 && bi >= 0) rows[bi].collected += t.total;
  }
  return rows.map((r) => ({ ...r, billed: round2(r.billed), collected: round2(r.collected) }));
}

/* ---------- reminders (drafts only — never sent automatically) ---------- */

export function reminderDraft(inv: StudioInvoice, today: string, link = '') {
  const t = calcTotals(inv);
  const b = inv.business;
  const late = daysBetween(inv.dueDate, today);
  const money = formatMoney(t.balanceDue, b.currency);
  const first = (inv.customer.name || 'there').split(' ')[0];
  const tone = late > 30 ? 'final' : late > 0 ? 'overdue' : 'friendly';
  const subject = tone === 'friendly'
    ? `Reminder: invoice ${inv.number} for ${money} is due ${formatDate(inv.dueDate)}`
    : tone === 'overdue'
      ? `Invoice ${inv.number} is ${late} day${late === 1 ? '' : 's'} past due`
      : `Final notice: invoice ${inv.number} (${money}) is ${late} days past due`;
  const lines = [
    `Hi ${first},`,
    '',
    tone === 'friendly'
      ? `Just a friendly reminder that invoice ${inv.number} for ${money} is due on ${formatDate(inv.dueDate)}.`
      : `Our records show invoice ${inv.number} for ${money} was due on ${formatDate(inv.dueDate)} and is now ${late} day${late === 1 ? '' : 's'} past due.`,
    tone === 'final' ? 'Please arrange payment as soon as possible or reply to let me know if there is an issue.' : 'If you have already sent payment, thank you and please disregard this note.',
  ];
  if (link) lines.push('', `View and pay online: ${link}`);
  if (inv.paymentInstructions) lines.push('', `Payment options: ${inv.paymentInstructions}`);
  const signer = b.ownerName || b.name;
  lines.push('', 'Thank you,', signer);
  if (b.name && b.name !== signer) lines.push(b.name);
  if (b.phone) lines.push(b.phone);
  return { to: inv.customer.email, subject, body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), tone };
}

/* ---------- CSV ---------- */

const csvCell = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function invoicesToCSV(invoices: StudioInvoice[], today: string): string {
  const header = ['Type', 'Number', 'Status', 'Customer', 'Email', 'Issue date', 'Due date', 'Terms', 'Currency', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance'];
  const rows = invoices.map((inv) => {
    const t = calcTotals(inv);
    return [inv.kind, inv.number, STATUS_STYLES[displayStatus(inv, today)].label, inv.customer.name, inv.customer.email,
      inv.issueDate, inv.dueDate, termsLabel(inv.termsDays), inv.business.currency,
      t.subtotal, t.discount, t.tax, t.total, t.amountPaid, t.balanceDue];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

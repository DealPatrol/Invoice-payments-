/**
 * Invoice Studio business suite: multiple brands, expenses, time tracking,
 * overdue reminder scheduling, view tracking, and tax summaries.
 * Pure functions so they run in the browser, on the server, and in tests.
 */
import { DEFAULT_PROFILE, calcTotals, newLineItem, paidAmount, uid, type BusinessProfile, type StudioInvoice } from './studio';
import { daysBetween } from './studio-ops';

export interface Brand { id: string; profile: BusinessProfile }

export interface Expense {
  id: string;
  brandId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  billable: boolean;
  invoiceId: string; // '' = not billed yet
}

export interface TimeEntry {
  id: string;
  brandId: string;
  date: string;
  description: string;
  hours: number;
  rate: number;
  clientId: string;
  invoiceId: string;
}

export interface StudioExtras {
  brands: Brand[];
  activeBrandId: string;
  expenses: Expense[];
  time: TimeEntry[];
  reminderOffsets: number[]; // days after due date
}

export const EXPENSE_CATEGORIES = ['Materials', 'Fuel', 'Equipment', 'Advertising', 'Software', 'Supplies', 'Shipping', 'Subcontractor', 'Other'];

export const STARTER_BRANDS: { name: string; tagline: string; invoicePrefix: string; accentColor: string }[] = [
  { name: 'Collins Lawncare', tagline: 'Mowing • Hay • Yard work', invoicePrefix: 'CL-', accentColor: '#15803d' },
  { name: 'Front Porch Growth', tagline: 'Local marketing for small businesses', invoicePrefix: 'FPG-', accentColor: '#1d4ed8' },
  { name: 'Custom Gifts Online', tagline: 'Personalized gifts', invoicePrefix: 'CGO-', accentColor: '#be185d' },
];

export const DEFAULT_EXTRAS: StudioExtras = { brands: [], activeBrandId: '', expenses: [], time: [], reminderOffsets: [1, 7, 14, 30] };

export function normalizeExtras(raw: Partial<StudioExtras> | null | undefined): StudioExtras {
  const r = raw ?? {};
  return {
    brands: Array.isArray(r.brands) ? r.brands.map((b) => ({ id: b.id, profile: { ...DEFAULT_PROFILE, ...b.profile } })) : [],
    activeBrandId: typeof r.activeBrandId === 'string' ? r.activeBrandId : '',
    expenses: Array.isArray(r.expenses) ? r.expenses : [],
    time: Array.isArray(r.time) ? r.time : [],
    reminderOffsets: Array.isArray(r.reminderOffsets) && r.reminderOffsets.length ? r.reminderOffsets.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b) : DEFAULT_EXTRAS.reminderOffsets,
  };
}

/** Builds brands from the current profile plus any missing starter brands. */
export function ensureBrands(extras: StudioExtras, current: BusinessProfile): StudioExtras {
  if (extras.brands.length) return extras;
  const first: Brand = { id: uid(), profile: current };
  const rest = STARTER_BRANDS.filter((s) => s.name.toLowerCase() !== current.name.toLowerCase())
    .map((s) => ({ id: uid(), profile: { ...current, ...s, nextNumber: 1001, logoDataUrl: '', paymentLinkUrl: '' } }));
  return { ...extras, brands: [first, ...rest], activeBrandId: first.id };
}

/** Writes the edited profile back into the active brand. */
export function syncActiveBrand(extras: StudioExtras, profile: BusinessProfile): StudioExtras {
  if (!extras.activeBrandId) return extras;
  return { ...extras, brands: extras.brands.map((b) => (b.id === extras.activeBrandId ? { ...b, profile } : b)) };
}

/* ---------- expenses & time ---------- */

export function unbilled(extras: StudioExtras, brandId: string) {
  const mine = (x: { brandId: string }) => !brandId || !x.brandId || x.brandId === brandId;
  return {
    expenses: extras.expenses.filter((e) => e.billable && !e.invoiceId && mine(e)),
    time: extras.time.filter((t) => !t.invoiceId && mine(t)),
  };
}

/** Adds time entries and billable expenses as line items and marks them billed. */
export function billToInvoice(inv: StudioInvoice, extras: StudioExtras, expenseIds: string[], timeIds: string[]): { invoice: StudioInvoice; extras: StudioExtras } {
  const exp = extras.expenses.filter((e) => expenseIds.includes(e.id) && !e.invoiceId);
  const tim = extras.time.filter((t) => timeIds.includes(t.id) && !t.invoiceId);
  const items = [
    ...tim.map((t) => newLineItem({ description: t.description || 'Labor', details: t.date, quantity: t.hours, unit: 'hr', unitPrice: t.rate })),
    ...exp.map((e) => newLineItem({ description: e.description || e.category, details: `${e.category} • ${e.date}`, quantity: 1, unit: 'ea', unitPrice: e.amount })),
  ];
  const blank = (i: StudioInvoice['items'][number]) => !i.description && !i.unitPrice;
  const invoice = { ...inv, items: [...inv.items.filter((i) => !blank(i)), ...items] };
  return {
    invoice,
    extras: {
      ...extras,
      expenses: extras.expenses.map((e) => (exp.includes(e) ? { ...e, invoiceId: inv.id } : e)),
      time: extras.time.map((t) => (tim.includes(t) ? { ...t, invoiceId: inv.id } : t)),
    },
  };
}

/* ---------- overdue reminders ---------- */

export interface ScheduledReminder { invoiceId: string; number: string; to: string; offset: number; key: string; daysLate: number }

/** Reminders that are due today or earlier and not yet sent (one per offset, newest offset only). */
export function dueReminders(invoices: StudioInvoice[], today: string, offsets: number[]): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  for (const inv of invoices) {
    if (inv.kind !== 'invoice' || inv.status === 'paid' || inv.status === 'void' || inv.status === 'draft') continue;
    if (calcTotals(inv).balanceDue <= 0) continue;
    const late = daysBetween(inv.dueDate, today);
    const reached = offsets.filter((o) => late >= o);
    if (!reached.length) continue;
    const offset = reached[reached.length - 1];
    const key = `overdue+${offset}`;
    if (inv.remindersSent.some((r) => r.startsWith(`${key}@`))) continue;
    out.push({ invoiceId: inv.id, number: inv.number, to: inv.customer.email, offset, key, daysLate: late });
  }
  return out;
}

export function nextReminderDate(inv: StudioInvoice, offsets: number[], today: string): string | null {
  if (inv.kind !== 'invoice' || inv.status === 'paid' || inv.status === 'void' || calcTotals(inv).balanceDue <= 0) return null;
  for (const o of offsets) {
    if (inv.remindersSent.some((r) => r.startsWith(`overdue+${o}@`))) continue;
    const d = new Date(`${inv.dueDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() + o);
    const iso = d.toISOString().slice(0, 10);
    if (iso >= today) return iso;
  }
  return null;
}

/* ---------- views ---------- */

export function recordViewOn(inv: StudioInvoice, at: string): StudioInvoice {
  const views = [...(inv.views ?? []), at].slice(-50);
  return { ...inv, views };
}

export function viewSummary(inv: StudioInvoice) {
  const views = inv.views ?? [];
  return { count: views.length, first: views[0] ?? '', last: views[views.length - 1] ?? '' };
}

/* ---------- tax summary ---------- */

export interface TaxRow { brand: string; invoiced: number; collected: number; taxInvoiced: number; taxCollected: number; expenses: number; net: number }

export interface TaxSummary {
  year: number;
  rows: TaxRow[];
  totals: TaxRow;
  expenseByCategory: { category: string; amount: number }[];
  quarters: { quarter: string; collected: number; taxCollected: number; expenses: number }[];
}

export function taxSummary(invoices: StudioInvoice[], extras: StudioExtras, year: number): TaxSummary {
  const brandName = (id: string, fallback: string) => extras.brands.find((b) => b.id === id)?.profile.name || fallback || 'Unassigned';
  const rows = new Map<string, TaxRow>();
  const row = (name: string) => {
    if (!rows.has(name)) rows.set(name, { brand: name, invoiced: 0, collected: 0, taxInvoiced: 0, taxCollected: 0, expenses: 0, net: 0 });
    return rows.get(name)!;
  };
  const quarters = [1, 2, 3, 4].map((q) => ({ quarter: `Q${q}`, collected: 0, taxCollected: 0, expenses: 0 }));
  const q = (iso: string) => quarters[Math.floor((Number(iso.slice(5, 7)) - 1) / 3)];
  const y = String(year);
  for (const inv of invoices) {
    if (inv.kind !== 'invoice' || inv.status === 'void') continue;
    const t = calcTotals(inv);
    const r = row(brandName(inv.brandId, inv.business.name));
    const ratio = t.total > 0 ? t.tax / t.total : 0;
    if (inv.issueDate.startsWith(y)) { r.invoiced += t.total; r.taxInvoiced += t.tax; }
    for (const p of inv.payments) {
      if (!p.date.startsWith(y)) continue;
      r.collected += p.amount;
      r.taxCollected += p.amount * ratio;
      if (q(p.date)) { q(p.date).collected += p.amount; q(p.date).taxCollected += p.amount * ratio; }
    }
    if (!inv.payments.length && inv.amountPaid > 0 && inv.issueDate.startsWith(y)) {
      r.collected += paidAmount(inv); r.taxCollected += paidAmount(inv) * ratio;
      if (q(inv.issueDate)) q(inv.issueDate).collected += paidAmount(inv);
    }
  }
  const cats = new Map<string, number>();
  for (const e of extras.expenses) {
    if (!e.date.startsWith(y)) continue;
    row(brandName(e.brandId, '')).expenses += e.amount;
    cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
    if (q(e.date)) q(e.date).expenses += e.amount;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const list = [...rows.values()].map((r) => ({ ...r, net: r.collected - r.taxCollected - r.expenses }))
    .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v])) as unknown as TaxRow);
  const totals = list.reduce((a, r) => ({ ...a, invoiced: r2(a.invoiced + r.invoiced), collected: r2(a.collected + r.collected), taxInvoiced: r2(a.taxInvoiced + r.taxInvoiced), taxCollected: r2(a.taxCollected + r.taxCollected), expenses: r2(a.expenses + r.expenses), net: r2(a.net + r.net) }),
    { brand: 'All brands', invoiced: 0, collected: 0, taxInvoiced: 0, taxCollected: 0, expenses: 0, net: 0 });
  return {
    year, rows: list, totals,
    expenseByCategory: [...cats.entries()].map(([category, amount]) => ({ category, amount: r2(amount) })).sort((a, b) => b.amount - a.amount),
    quarters: quarters.map((x) => ({ quarter: x.quarter, collected: r2(x.collected), taxCollected: r2(x.taxCollected), expenses: r2(x.expenses) })),
  };
}

export function taxSummaryCSV(s: TaxSummary): string {
  const lines = [['Brand', 'Invoiced', 'Collected', 'Sales tax invoiced', 'Sales tax collected', 'Expenses', 'Net (collected - tax - expenses)'].join(',')];
  for (const r of [...s.rows, s.totals]) lines.push([`"${r.brand.replace(/"/g, '""')}"`, r.invoiced, r.collected, r.taxInvoiced, r.taxCollected, r.expenses, r.net].join(','));
  lines.push('', 'Quarter,Collected,Tax collected,Expenses');
  for (const x of s.quarters) lines.push([x.quarter, x.collected, x.taxCollected, x.expenses].join(','));
  lines.push('', 'Expense category,Amount');
  for (const c of s.expenseByCategory) lines.push([`"${c.category}"`, c.amount].join(','));
  return lines.join('\n');
}

/* ---------- client portal ---------- */

export function clientKey(email: string) { return email.trim().toLowerCase(); }

export function portalDocs(invoices: StudioInvoice[], email: string) {
  const key = clientKey(email);
  return invoices.filter((i) => key && clientKey(i.customer.email) === key && i.status !== 'draft' && !(i.kind === 'estimate' && i.estimateStatus === 'draft'));
}

const EXTRAS_KEY = 'invoiceos.studio.extras.v1';
export function loadExtras(): StudioExtras {
  if (typeof window === 'undefined') return DEFAULT_EXTRAS;
  try { return normalizeExtras(JSON.parse(localStorage.getItem(EXTRAS_KEY) ?? 'null')); } catch { return DEFAULT_EXTRAS; }
}
export function saveExtras(x: StudioExtras): boolean {
  try { localStorage.setItem(EXTRAS_KEY, JSON.stringify(x)); return true; } catch { return false; }
}

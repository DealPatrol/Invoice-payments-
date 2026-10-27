/**
 * Invoice Studio — a universal, offline-first invoice builder.
 * Works for any business with no account or database: profile, customers,
 * and invoices are stored in the browser (localStorage) and can be exported.
 */

export type DiscountType = 'percent' | 'amount';
export type StudioStatus = 'draft' | 'sent' | 'paid' | 'void';
export type DocKind = 'invoice' | 'estimate';
export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
export type RecurringInterval = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type DisplayStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void' | 'accepted' | 'declined' | 'converted' | 'expired';

export interface TaxPreset { name: string; rate: number }

export interface StudioPayment {
  id: string;
  date: string; // yyyy-mm-dd
  amount: number;
  method: string; // cash, check, card, Venmo, Stripe, …
  reference: string;
}

export interface RecurringRule {
  interval: RecurringInterval;
  nextDate: string; // next issue date
  endDate: string; // '' = forever
  active: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  details: string;
  unit: string;
  unitPrice: number;
  taxable: boolean;
}

export interface StudioClient extends StudioCustomer {
  id: string;
  notes: string;
  createdAt: string;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string; // multi-line
  website: string;
  taxId: string;
  logoDataUrl: string;
  accentColor: string;
  currency: string;
  invoicePrefix: string;
  nextNumber: number;
  defaultTermsDays: number;
  defaultTaxRate: number;
  defaultNotes: string;
  paymentInstructions: string;
  estimatePrefix: string;
  nextEstimateNumber: number;
  taxPresets: TaxPreset[];
  paymentLinkUrl: string; // e.g. a Stripe Payment Link (test mode) shown as a Pay button
  lateFeePercent: number;
}

export interface StudioCustomer {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

export interface StudioLineItem {
  id: string;
  description: string;
  details: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface StudioInvoice {
  id: string;
  kind: DocKind;
  number: string;
  status: StudioStatus;
  estimateStatus: EstimateStatus;
  clientId: string;
  payments: StudioPayment[];
  recurring: RecurringRule | null;
  paymentLink: string;
  convertedFromId: string;
  convertedToId: string;
  sentAt: string;
  remindersSent: string[];
  issueDate: string; // yyyy-mm-dd
  dueDate: string;
  termsDays: number;
  serviceDate: string;
  poNumber: string;
  customer: StudioCustomer;
  items: StudioLineItem[];
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  shipping: number;
  amountPaid: number;
  notes: string;
  paymentInstructions: string;
  business: BusinessProfile; // snapshot at time of issue
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  shipping: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
}

export const TERMS_OPTIONS = [
  { days: 0, label: 'Due on receipt' },
  { days: 7, label: 'Net 7' },
  { days: 15, label: 'Net 15' },
  { days: 30, label: 'Net 30' },
  { days: 45, label: 'Net 45' },
  { days: 60, label: 'Net 60' },
];

export const STUDIO_CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'MXN', 'INR', 'JPY', 'BRL', 'ZAR'];

export const UNIT_SUGGESTIONS = ['ea', 'hr', 'day', 'visit', 'job', 'bale', 'yd', 'sq ft', 'lb', 'mo'];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item: Pick<StudioLineItem, 'quantity' | 'unitPrice'>): number {
  return round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
}

export function paidAmount(inv: { amountPaid?: number; payments?: StudioPayment[] }): number {
  return round2((Number(inv.amountPaid) || 0) + (inv.payments ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0));
}

export function calcTotals(inv: Pick<StudioInvoice, 'items' | 'discountType' | 'discountValue' | 'taxRate' | 'shipping' | 'amountPaid'> & { payments?: StudioPayment[] }): InvoiceTotals {
  const subtotal = round2(inv.items.reduce((s, i) => s + lineTotal(i), 0));
  const rawDiscount = inv.discountType === 'percent'
    ? subtotal * ((Number(inv.discountValue) || 0) / 100)
    : Number(inv.discountValue) || 0;
  const discount = round2(Math.min(Math.max(rawDiscount, 0), subtotal));
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * ((Number(inv.taxRate) || 0) / 100));
  const shipping = round2(Number(inv.shipping) || 0);
  const total = round2(taxable + tax + shipping);
  const amountPaid = paidAmount(inv);
  return { subtotal, discount, taxable, tax, shipping, total, amountPaid, balanceDue: round2(total - amountPaid) };
}

export function formatMoney(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

export function formatInvoiceNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, '0')}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const DEFAULT_PROFILE: BusinessProfile = {
  name: 'Your Business',
  tagline: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  taxId: '',
  logoDataUrl: '',
  accentColor: '#4f6ef7',
  currency: 'USD',
  invoicePrefix: 'INV-',
  nextNumber: 1001,
  defaultTermsDays: 15,
  defaultTaxRate: 0,
  defaultNotes: 'Thank you for your business!',
  paymentInstructions: '',
  estimatePrefix: 'EST-',
  nextEstimateNumber: 101,
  taxPresets: [{ name: 'No tax', rate: 0 }],
  paymentLinkUrl: '',
  lateFeePercent: 0,
};

export const EMPTY_CUSTOMER: StudioCustomer = { name: '', company: '', email: '', phone: '', address: '' };

export function newLineItem(partial: Partial<StudioLineItem> = {}): StudioLineItem {
  return { id: uid(), description: '', details: '', quantity: 1, unit: '', unitPrice: 0, ...partial };
}

export function newInvoice(profile: BusinessProfile, kind: DocKind = 'invoice', today = todayISO()): StudioInvoice {
  const issueDate = today;
  const now = new Date().toISOString();
  return {
    id: uid(),
    kind,
    number: kind === 'estimate'
      ? formatInvoiceNumber(profile.estimatePrefix, profile.nextEstimateNumber)
      : formatInvoiceNumber(profile.invoicePrefix, profile.nextNumber),
    status: 'draft',
    estimateStatus: 'draft',
    clientId: '',
    payments: [],
    recurring: null,
    paymentLink: '',
    convertedFromId: '',
    convertedToId: '',
    sentAt: '',
    remindersSent: [],
    issueDate,
    termsDays: kind === 'estimate' ? 30 : profile.defaultTermsDays,
    dueDate: addDays(issueDate, kind === 'estimate' ? 30 : profile.defaultTermsDays),
    serviceDate: '',
    poNumber: '',
    customer: { ...EMPTY_CUSTOMER },
    items: [newLineItem()],
    discountType: 'percent',
    discountValue: 0,
    taxRate: profile.defaultTaxRate,
    shipping: 0,
    amountPaid: 0,
    notes: profile.defaultNotes,
    paymentInstructions: profile.paymentInstructions,
    business: { ...profile },
    createdAt: now,
    updatedAt: now,
  };
}

export function termsLabel(days: number): string {
  return TERMS_OPTIONS.find((t) => t.days === days)?.label ?? `Net ${days}`;
}

/* ---------- storage ---------- */

const PROFILE_KEY = 'invoiceos.studio.profile.v1';
const INVOICES_KEY = 'invoiceos.studio.invoices.v1';

export function loadProfile(): BusinessProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: BusinessProfile): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadInvoices(): StudioInvoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    return raw ? (JSON.parse(raw) as Partial<StudioInvoice>[]).map(normalizeInvoice) : [];
  } catch {
    return [];
  }
}

/** Upgrade records saved by older versions so every field exists. */
export function normalizeInvoice(raw: Partial<StudioInvoice>): StudioInvoice {
  const base = newInvoice({ ...DEFAULT_PROFILE, ...(raw.business ?? {}) }, raw.kind ?? 'invoice', raw.issueDate || todayISO());
  return {
    ...base,
    ...raw,
    business: { ...DEFAULT_PROFILE, ...(raw.business ?? {}) },
    customer: { ...EMPTY_CUSTOMER, ...(raw.customer ?? {}) },
    items: (raw.items ?? base.items).map((i) => ({ ...newLineItem(), ...i })),
    payments: raw.payments ?? [],
    remindersSent: raw.remindersSent ?? [],
  } as StudioInvoice;
}

const CLIENTS_KEY = 'invoiceos.studio.clients.v1';
const CATALOG_KEY = 'invoiceos.studio.catalog.v1';

function loadList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const loadClients = () => loadList<StudioClient>(CLIENTS_KEY);
export const saveClients = (list: StudioClient[]) => localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));
export const loadCatalog = () => loadList<CatalogItem>(CATALOG_KEY);
export const saveCatalog = (list: CatalogItem[]) => localStorage.setItem(CATALOG_KEY, JSON.stringify(list));

export function saveInvoices(list: StudioInvoice[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/* ---------- shareable links (base64url JSON) ---------- */

export function encodeInvoice(inv: StudioInvoice): string {
  // Logo data URLs are tens of KB and push the shared URL past browser, mail, and host limits.
  const json = JSON.stringify({ ...inv, business: { ...inv.business, logoDataUrl: '' } });
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInvoice(encoded: string): StudioInvoice | null {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return normalizeInvoice(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

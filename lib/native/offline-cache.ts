/**
 * Keys and shapes shared by the signed-in app (NativeBridge) and the bundled offline page
 * (ios-shell/offline.html). Values live in @capacitor/preferences (UserDefaults), on device only.
 */
export const PREF_KEYS = {
  invoices: 'il.cache.invoices',
  clients: 'il.cache.clients',
  savedAt: 'il.cache.savedAt',
  drafts: 'il.offline.drafts',
  lockEnabled: 'il.lock.enabled',
  remindersEnabled: 'il.reminders.enabled',
  scheduledReminderIds: 'il.reminders.ids',
} as const;

export const MAX_CACHED_INVOICES = 200;
export const MAX_CACHED_CLIENTS = 300;

export interface CachedInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  status: string;
  dueDate: string;
  total: number;
  currency: string;
}

export interface CachedClient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  currency?: string;
}

export interface OfflineDraft {
  id: string;
  createdAt: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  dueDate: string;
  notes: string;
  items: Array<{ description: string; quantity: number; unitRate: number }>;
}

type Loose = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

export function toCachedInvoices(rows: unknown): CachedInvoice[] {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_CACHED_INVOICES).map((r: Loose) => ({
    id: str(r.id),
    invoiceNumber: str(r.invoiceNumber),
    clientName: str(r.clientName),
    clientEmail: str(r.clientEmail),
    status: str(r.status),
    dueDate: str(r.dueDate),
    total: num(r.total),
    currency: str(r.currency) || 'USD',
  })).filter((r) => r.id);
}

export function toCachedClients(rows: unknown): CachedClient[] {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_CACHED_CLIENTS).map((r: Loose) => ({
    id: str(r.id),
    name: str(r.name),
    email: str(r.email),
    phone: r.phone == null ? null : str(r.phone),
    currency: str(r.currency) || 'USD',
  })).filter((r) => r.id && r.name);
}

/** Request body for POST /api/invoices built from an offline draft (same schema as the web form). */
export function draftToInvoiceInput(d: OfflineDraft, country = 'US') {
  return {
    clientName: d.clientName.trim(),
    clientEmail: d.clientEmail.trim(),
    country,
    currency: (d.currency || 'USD').toUpperCase().slice(0, 3),
    dueDate: d.dueDate,
    notes: d.notes || undefined,
    taxRate: 0,
    items: d.items
      .filter((i) => i.description.trim() && i.quantity > 0)
      .map((i) => ({ description: i.description.trim(), quantity: i.quantity, unitRate: Math.max(0, i.unitRate) })),
  };
}

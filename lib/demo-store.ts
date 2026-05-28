import { nanoid } from 'nanoid';
import type { CreateInvoiceInput, DashboardStats, Invoice } from './types';

const seed: Invoice[] = [
  {
    id: 'inv_1',
    invoiceNumber: 'INV-2025-001',
    clientName: 'Acme Corp',
    clientEmail: 'billing@acme.com',
    country: 'United States',
    currency: 'USD',
    network: 'PEPPOL',
    status: 'paid',
    dueDate: '2025-04-30',
    issuedDate: '2025-04-01',
    paidDate: '2025-04-28',
    subtotal: 2500,
    taxRate: 0.08,
    taxAmount: 200,
    total: 2700,
    notes: 'Net 30 — thank you for your business.',
    items: [{ description: 'Consulting — April', quantity: 1, unitRate: 2500 }],
    payToken: 'demo-acme-001',
    payScore: 92,
  },
  {
    id: 'inv_2',
    invoiceNumber: 'INV-2025-002',
    clientName: 'Tech Innovations LLC',
    clientEmail: 'ap@techinnovate.com',
    country: 'United Kingdom',
    currency: 'EUR',
    network: 'PEPPOL',
    status: 'pending',
    dueDate: '2025-06-15',
    issuedDate: '2025-05-15',
    subtotal: 5000,
    taxRate: 0.2,
    taxAmount: 1000,
    total: 6000,
    notes: '',
    items: [{ description: 'Platform integration', quantity: 1, unitRate: 5000 }],
    payToken: 'demo-tech-002',
    payScore: 71,
    lateFeePercent: 1.5,
  },
  {
    id: 'inv_3',
    invoiceNumber: 'INV-2025-003',
    clientName: 'Global Solutions GmbH',
    clientEmail: 'kontakt@globalsolutions.de',
    country: 'Germany',
    currency: 'EUR',
    network: 'ZUGFeRD',
    status: 'overdue',
    dueDate: '2025-05-01',
    issuedDate: '2025-04-01',
    subtotal: 3750,
    taxRate: 0.19,
    taxAmount: 712.5,
    total: 4462.5,
    notes: 'Late fee applies after due date.',
    items: [{ description: 'Annual support', quantity: 1, unitRate: 3750 }],
    payToken: 'demo-global-003',
    payScore: 48,
    lateFeePercent: 2,
  },
  {
    id: 'inv_4',
    invoiceNumber: 'INV-2025-004',
    clientName: 'Japanese Partners Co',
    clientEmail: 'info@japanpartners.jp',
    country: 'Japan',
    currency: 'JPY',
    network: 'JP e-Invoice',
    status: 'draft',
    dueDate: '2025-07-30',
    issuedDate: '2025-05-27',
    subtotal: 420000,
    taxRate: 0.1,
    taxAmount: 42000,
    total: 462000,
    notes: '',
    items: [{ description: 'Localization project', quantity: 1, unitRate: 420000 }],
    payToken: 'demo-jp-004',
    payScore: 65,
  },
];

type StoreGlobal = { __invoiceosStore?: Map<string, Invoice> };

function store(): Map<string, Invoice> {
  const g = globalThis as StoreGlobal;
  if (!g.__invoiceosStore) {
    g.__invoiceosStore = new Map(seed.map((inv) => [inv.id, inv]));
  }
  return g.__invoiceosStore;
}

function computePayScore(dueDate: string, status: string): number {
  const daysUntilDue = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (status === 'paid') return 95;
  if (status === 'overdue') return Math.max(20, 55 - Math.abs(daysUntilDue));
  if (daysUntilDue > 14) return 78;
  if (daysUntilDue > 7) return 68;
  return 58;
}

export const demoStore = {
  list(filters?: { status?: string; search?: string }): Invoice[] {
    let list = Array.from(store().values());
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((i) => i.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.clientName.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
    );
  },

  getById(id: string) {
    return store().get(id) ?? null;
  },

  getByPayToken(token: string) {
    return Array.from(store().values()).find((i) => i.payToken === token) ?? null;
  },

  create(input: CreateInvoiceInput): Invoice {
    const subtotal = input.items.reduce(
      (s, item) => s + item.quantity * item.unitRate,
      0
    );
    const taxAmount = subtotal * input.taxRate;
    const total = subtotal + taxAmount;
    const id = `inv_${nanoid(8)}`;
    const count = store().size + 1;
    const invoice: Invoice = {
      id,
      invoiceNumber: `INV-2025-${String(count).padStart(3, '0')}`,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      country: input.country,
      currency: input.currency,
      network: input.network || '',
      status: 'draft',
      dueDate: input.dueDate,
      issuedDate: new Date().toISOString().split('T')[0],
      subtotal,
      taxRate: input.taxRate,
      taxAmount,
      total,
      notes: input.notes || '',
      items: input.items,
      payToken: nanoid(12),
      recurring: input.recurring,
      lateFeePercent: input.lateFeePercent ?? 0,
      payScore: computePayScore(input.dueDate, 'draft'),
    };
    store().set(id, invoice);
    return invoice;
  },

  updateStatus(id: string, status: Invoice['status']) {
    const inv = store().get(id);
    if (!inv) return null;
    const updated: Invoice = {
      ...inv,
      status,
      paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : inv.paidDate,
      payScore: computePayScore(inv.dueDate, status),
    };
    store().set(id, updated);
    return updated;
  },

  delete(id: string) {
    return store().delete(id);
  },

  stats(): DashboardStats {
    const invoices = Array.from(store().values());
    let totalRevenue = 0;
    let collected = 0;
    let outstandingCount = 0;
    let overdueCount = 0;
    let payScoreSum = 0;

    for (const inv of invoices) {
      totalRevenue += inv.total;
      if (inv.status === 'paid') collected += inv.total;
      if (['sent', 'pending'].includes(inv.status)) outstandingCount++;
      if (inv.status === 'overdue') overdueCount++;
      payScoreSum += inv.payScore ?? 70;
    }

    const collectionRate =
      totalRevenue > 0 ? Math.round((collected / totalRevenue) * 1000) / 10 : 0;

    return {
      totalRevenue,
      collected,
      outstandingCount,
      overdueCount,
      collectionRate,
      avgPayScore: invoices.length
        ? Math.round(payScoreSum / invoices.length)
        : 0,
    };
  },
};

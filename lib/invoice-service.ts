import { nanoid } from 'nanoid';
import { PRICING, isDemoMode, isPlan, type Plan } from './config';
import { prisma } from './db';
import { demoStore } from './demo-store';
import type { CreateInvoiceInput, DashboardStats, Invoice, InvoiceStatus } from './types';

type PrismaInvoice = {
  id: string;
  invoiceNumber: string;
  payToken: string;
  status: string;
  currency: string;
  amount: number;
  tax: number;
  total: number;
  issueDate: Date;
  dueDate: Date;
  paidDate: Date | null;
  network: string | null;
  notes: string | null;
  recurring: boolean;
  lateFeePercent: number;
  payScore: number;
  stripeSessionId: string | null;
  client: { name: string; email: string; country: string };
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
};

export type DataMode = 'postgres' | 'demo';

function toInvoice(row: PrismaInvoice): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    clientName: row.client.name,
    clientEmail: row.client.email,
    country: row.client.country,
    currency: row.currency,
    network: row.network ?? '',
    status: row.status as InvoiceStatus,
    dueDate: row.dueDate.toISOString().slice(0, 10),
    issuedDate: row.issueDate.toISOString().slice(0, 10),
    paidDate: row.paidDate?.toISOString().slice(0, 10),
    subtotal: row.amount,
    taxRate: row.amount > 0 ? row.tax / row.amount : 0,
    taxAmount: row.tax,
    total: row.total,
    notes: row.notes ?? '',
    items: row.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitRate: item.unitPrice,
    })),
    payToken: row.payToken,
    stripeSessionId: row.stripeSessionId ?? undefined,
    recurring: row.recurring,
    lateFeePercent: row.lateFeePercent,
    payScore: row.payScore,
  };
}

const invoiceInclude = { client: true, items: true } as const;

export async function listInvoices(
  userId: string,
  filters?: { status?: string; search?: string }
): Promise<{ invoices: Invoice[]; mode: DataMode }> {
  if (isDemoMode()) return { invoices: demoStore.list(filters), mode: 'demo' };

  const rows = await prisma.invoice.findMany({
    where: {
      userId,
      ...(filters?.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { invoiceNumber: { contains: filters.search, mode: 'insensitive' as const } },
              { client: { name: { contains: filters.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    include: invoiceInclude,
    orderBy: { createdAt: 'desc' },
  });
  return { invoices: rows.map(toInvoice), mode: 'postgres' };
}

export async function getInvoice(userId: string, id: string): Promise<Invoice | null> {
  if (isDemoMode()) return demoStore.getById(id);
  const row = await prisma.invoice.findFirst({
    where: { id, userId },
    include: invoiceInclude,
  });
  return row ? toInvoice(row) : null;
}

export async function getInvoiceByPayToken(token: string): Promise<Invoice | null> {
  if (isDemoMode()) return demoStore.getByPayToken(token);
  const row = await prisma.invoice.findUnique({
    where: { payToken: token },
    include: invoiceInclude,
  });
  return row ? toInvoice(row) : null;
}

function clientEmail(input: CreateInvoiceInput): string {
  if (input.clientEmail) return input.clientEmail.toLowerCase();
  return `${input.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@no-email.invoiceos`;
}

async function assertInvoiceLimit(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const plan: Plan = user && isPlan(user.plan) ? user.plan : 'starter';
  const limit = PRICING[plan].invoices;
  if (limit === null) return;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const count = await prisma.invoice.count({
    where: { userId, createdAt: { gte: monthStart } },
  });
  if (count >= limit) {
    throw new Error(`${PRICING[plan].name} allows ${limit} invoices per month`);
  }
}

export async function createInvoice(
  userId: string,
  input: CreateInvoiceInput
): Promise<{ invoice: Invoice; mode: DataMode }> {
  if (isDemoMode()) return { invoice: demoStore.create(input), mode: 'demo' };
  await assertInvoiceLimit(userId);

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitRate,
    0
  );
  const tax = subtotal * input.taxRate;
  const email = clientEmail(input);

  const invoice = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const plan: Plan = isPlan(user.plan) ? user.plan : 'starter';
    if (
      plan === 'starter' &&
      (input.recurring || (input.lateFeePercent ?? 0) > 0)
    ) {
      throw new Error('Recurring invoices and late-fee automation require Growth or Scale');
    }
    const existingClient = await tx.client.findUnique({
      where: { userId_email: { userId, email } },
    });
    if (!existingClient) {
      const clientLimit = PRICING[plan].clients;
      if (clientLimit !== null) {
        const count = await tx.client.count({ where: { userId } });
        if (count >= clientLimit) {
          throw new Error(`${PRICING[plan].name} allows ${clientLimit} clients`);
        }
      }
    }

    const client = await tx.client.upsert({
      where: { userId_email: { userId, email } },
      update: {
        name: input.clientName,
        country: input.country,
        currency: input.currency,
      },
      create: {
        userId,
        name: input.clientName,
        email,
        country: input.country,
        currency: input.currency,
      },
    });
    const count = await tx.invoice.count({ where: { userId } });
    return tx.invoice.create({
      data: {
        userId,
        clientId: client.id,
        invoiceNumber: `INV-${new Date().getUTCFullYear()}-${String(count + 1).padStart(4, '0')}`,
        payToken: nanoid(20),
        currency: input.currency,
        amount: subtotal,
        tax,
        total: subtotal + tax,
        issueDate: new Date(),
        dueDate: new Date(input.dueDate),
        network: input.network || null,
        notes: input.notes || null,
        recurring: input.recurring ?? false,
        lateFeePercent: input.lateFeePercent ?? 0,
        items: {
          create: input.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitRate,
            taxRate: input.taxRate,
            total: item.quantity * item.unitRate,
          })),
        },
      },
      include: invoiceInclude,
    });
  });

  return { invoice: toInvoice(invoice), mode: 'postgres' };
}

export async function updateInvoiceStatus(
  userId: string,
  id: string,
  status: InvoiceStatus
): Promise<Invoice | null> {
  if (isDemoMode()) return demoStore.updateStatus(id, status);
  const existing = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await prisma.invoice.update({
    where: { id },
    data: { status, paidDate: status === 'paid' ? new Date() : undefined },
    include: invoiceInclude,
  });
  return toInvoice(row);
}

export async function deleteInvoice(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demoStore.delete(id);
  const result = await prisma.invoice.deleteMany({ where: { id, userId } });
  return result.count === 1;
}

export async function getDashboardStats(
  userId: string
): Promise<{ stats: DashboardStats; mode: DataMode }> {
  if (isDemoMode()) return { stats: demoStore.stats(), mode: 'demo' };
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    select: { status: true, total: true, payScore: true },
  });
  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
  return {
    stats: {
      totalRevenue,
      collected,
      outstandingCount: invoices.filter((invoice) =>
        ['sent', 'pending'].includes(invoice.status)
      ).length,
      overdueCount: invoices.filter((invoice) => invoice.status === 'overdue').length,
      collectionRate: totalRevenue ? Math.round((collected / totalRevenue) * 1000) / 10 : 0,
      avgPayScore: invoices.length
        ? Math.round(invoices.reduce((sum, invoice) => sum + invoice.payScore, 0) / invoices.length)
        : 0,
    },
    mode: 'postgres',
  };
}

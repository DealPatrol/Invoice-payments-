import { demoStore } from './demo-store';
import { getSupabaseAdmin } from './supabase-admin';
import type { CreateInvoiceInput, DashboardStats, Invoice } from './types';
import { nanoid } from 'nanoid';

function rowToInvoice(row: Record<string, unknown>, items: LineItemRow[] = []): Invoice {
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    clientName: row.client_name as string,
    clientEmail: (row.client_email as string) || '',
    country: (row.country as string) || '',
    currency: row.currency as string,
    network: (row.network as string) || '',
    status: row.status as Invoice['status'],
    dueDate: row.due_date as string,
    issuedDate: row.created_at
      ? String(row.created_at).split('T')[0]
      : new Date().toISOString().split('T')[0],
    paidDate: row.paid_date as string | undefined,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    notes: (row.notes as string) || '',
    items: items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitRate: Number(i.unit_rate),
    })),
    payToken: (row.pay_token as string) || nanoid(12),
    stripeSessionId: row.stripe_session_id as string | undefined,
    payScore: row.pay_score != null ? Number(row.pay_score) : 70,
    lateFeePercent: row.late_fee_percent != null ? Number(row.late_fee_percent) : 0,
    recurring: Boolean(row.recurring),
  };
}

interface LineItemRow {
  description: string;
  quantity: number;
  unit_rate: number;
}

export async function listInvoices(filters?: {
  status?: string;
  search?: string;
}): Promise<{ invoices: Invoice[]; mode: 'supabase' | 'demo' }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { invoices: demoStore.list(filters), mode: 'demo' };
  }

  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.or(
      `client_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const invoices = (data || []).map((row) =>
    rowToInvoice(row, row.invoice_items || [])
  );
  return { invoices, mode: 'supabase' };
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoStore.getById(id);

  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToInvoice(data, data.invoice_items || []);
}

export async function getInvoiceByPayToken(token: string): Promise<Invoice | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoStore.getByPayToken(token);

  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('pay_token', token)
    .single();
  if (error || !data) return null;
  return rowToInvoice(data, data.invoice_items || []);
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ invoice: Invoice; mode: 'supabase' | 'demo' }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { invoice: demoStore.create(input), mode: 'demo' };
  }

  const subtotal = input.items.reduce(
    (s, item) => s + item.quantity * item.unitRate,
    0
  );
  const taxAmount = subtotal * input.taxRate;
  const total = subtotal + taxAmount;
  const payToken = nanoid(12);

  const { data: numData, error: numError } = await supabase.rpc('next_invoice_number');
  if (numError) throw new Error(numError.message);

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: numData,
      client_name: input.clientName,
      client_email: input.clientEmail,
      country: input.country,
      currency: input.currency,
      network: input.network || '',
      notes: input.notes || '',
      due_date: input.dueDate,
      status: 'draft',
      subtotal,
      tax_rate: input.taxRate,
      tax_amount: taxAmount,
      total,
      pay_token: payToken,
      recurring: input.recurring ?? false,
      late_fee_percent: input.lateFeePercent ?? 0,
      pay_score: 70,
    })
    .select()
    .single();

  if (invoiceError) throw new Error(invoiceError.message);

  const lineItems = input.items
    .filter((item) => item.description || item.unitRate > 0)
    .map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_rate: item.unitRate,
      sort_order: index,
    }));

  if (lineItems.length > 0) {
    const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);
    if (itemsError) throw new Error(itemsError.message);
  }

  return {
    invoice: rowToInvoice(invoice, lineItems.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit_rate: l.unit_rate,
    }))),
    mode: 'supabase',
  };
}

export async function updateInvoiceStatus(
  id: string,
  status: Invoice['status']
): Promise<Invoice | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoStore.updateStatus(id, status);

  const updates: Record<string, string> = { status };
  if (status === 'paid') {
    updates.paid_date = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select('*, invoice_items(*)')
    .single();

  if (error || !data) return null;
  return rowToInvoice(data, data.invoice_items || []);
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return demoStore.delete(id);

  const { error } = await supabase.from('invoices').delete().eq('id', id);
  return !error;
}

export async function getDashboardStats(): Promise<{
  stats: DashboardStats;
  mode: 'supabase' | 'demo';
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { stats: demoStore.stats(), mode: 'demo' };
  }

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('status, total, pay_score');
  if (error) throw new Error(error.message);

  let totalRevenue = 0;
  let collected = 0;
  let outstandingCount = 0;
  let overdueCount = 0;
  let payScoreSum = 0;

  for (const inv of invoices || []) {
    totalRevenue += Number(inv.total);
    if (inv.status === 'paid') collected += Number(inv.total);
    if (['sent', 'pending'].includes(inv.status)) outstandingCount++;
    if (inv.status === 'overdue') overdueCount++;
    payScoreSum += Number(inv.pay_score ?? 70);
  }

  const collectionRate =
    totalRevenue > 0 ? Math.round((collected / totalRevenue) * 1000) / 10 : 0;

  return {
    stats: {
      totalRevenue,
      collected,
      outstandingCount,
      overdueCount,
      collectionRate,
      avgPayScore: invoices?.length
        ? Math.round(payScoreSum / invoices.length)
        : 0,
    },
    mode: 'supabase',
  };
}

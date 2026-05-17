import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$',
  AUD: 'A$', JPY: '¥', BRL: 'R$', INR: '₹', MXN: 'MX$',
};

export const TAX_RATES = {
  'United States': 0.08, 'United Kingdom': 0.20, 'Germany': 0.19,
  'France': 0.20, 'Canada': 0.13, 'Australia': 0.10,
  'Japan': 0.10, 'Brazil': 0.17, 'India': 0.18, 'Mexico': 0.16,
};

export async function getInvoices({ status, search, limit = 50 } = {}) {
  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`client_name.ilike.%${search}%,invoice_number.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createInvoice(invoiceData) {
  const { items, ...invoiceFields } = invoiceData;

  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), 0
  );
  const taxRate = TAX_RATES[invoiceFields.country] || 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const { data: numData, error: numError } = await supabase.rpc('next_invoice_number');
  if (numError) throw numError;

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: numData,
      client_name: invoiceFields.client,
      client_email: invoiceFields.email,
      country: invoiceFields.country,
      currency: invoiceFields.currency,
      currency_symbol: CURRENCY_SYMBOLS[invoiceFields.currency] || '$',
      network: invoiceFields.network,
      notes: invoiceFields.notes,
      due_date: invoiceFields.dueDate || null,
      status: 'draft',
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
    })
    .select().single();

  if (invoiceError) throw invoiceError;

  const lineItems = items
    .filter(item => item.desc || item.rate > 0)
    .map((item, index) => ({
      invoice_id: invoice.id,
      description: item.desc,
      quantity: parseFloat(item.qty) || 1,
      unit_rate: parseFloat(item.rate) || 0,
      sort_order: index,
    }));

  if (lineItems.length > 0) {
    const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);
    if (itemsError) throw itemsError;
  }

  return invoice;
}

export async function updateInvoiceStatus(id, status) {
  const updates = { status };
  if (status === 'paid') updates.paid_date = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('invoices').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}

export async function getDashboardStats() {
  const { data: invoices, error } = await supabase
    .from('invoices').select('status, total, currency, created_at');
  if (error) throw error;

  const stats = {
    total_revenue: 0, collected: 0,
    outstanding_count: 0, overdue_count: 0, draft_count: 0,
  };

  for (const inv of invoices) {
    const usdValue = inv.currency === 'USD' ? inv.total :
      inv.currency === 'EUR' ? inv.total * 1.08 :
      inv.currency === 'GBP' ? inv.total * 1.27 : inv.total * 0.93;

    stats.total_revenue += usdValue;
    if (inv.status === 'paid') stats.collected += usdValue;
    if (['sent', 'pending'].includes(inv.status)) stats.outstanding_count++;
    if (inv.status === 'overdue') stats.overdue_count++;
    if (inv.status === 'draft') stats.draft_count++;
  }

  return stats;
}

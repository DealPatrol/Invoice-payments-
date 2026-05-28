import { NextRequest, NextResponse } from 'next/server';
import { getInvoice, updateInvoiceStatus } from '@/lib/invoice-service';
import { createCheckoutSession } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await getInvoice(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    const session = await createCheckoutSession(invoice);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase
        .from('invoices')
        .update({ stripe_session_id: session.id, status: 'sent' })
        .eq('id', invoice.id);
    } else if (invoice.status === 'draft') {
      await updateInvoiceStatus(invoice.id, 'sent');
    }

    return NextResponse.json({ url: session.url, payLink: `/pay/${invoice.payToken}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

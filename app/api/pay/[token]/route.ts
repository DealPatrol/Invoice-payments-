import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceByPayToken } from '@/lib/invoice-service';
import { createCheckoutSession } from '@/lib/stripe';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invoice = await getInvoiceByPayToken(params.token);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const invoice = await getInvoiceByPayToken(params.token);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });
    }
    const session = await createCheckoutSession(invoice);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Payment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

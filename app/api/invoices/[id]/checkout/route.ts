import { NextRequest, NextResponse } from 'next/server';
import { getInvoice } from '@/lib/invoice-service';
import { createCheckoutSession } from '@/lib/stripe';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getTenantId();
    const invoice = await getInvoice(userId, params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    const session = await createCheckoutSession(invoice, userId);

    return NextResponse.json({ url: session.url, payLink: `/pay/${invoice.payToken}` });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

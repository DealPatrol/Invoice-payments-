import { NextRequest, NextResponse } from 'next/server';
import { getInvoice } from '@/lib/invoice-service';
import { createCheckoutSession } from '@/lib/stripe';
import { getTenantId, UnauthorizedError } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const userId = await getTenantId();
    const { invoiceId } = await request.json();
    const invoice = await getInvoice(userId, invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const checkoutSession = await createCheckoutSession(invoice, userId);
    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

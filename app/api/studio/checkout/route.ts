import { NextRequest, NextResponse } from 'next/server';
import { appUrl } from '@/lib/config';
import { amountForStripe, getStripe } from '@/lib/stripe';
import { calcTotals, decodeInvoice } from '@/lib/studio';

/**
 * Creates a Stripe Checkout Session for the balance of an Invoice Studio invoice.
 * Disabled unless STUDIO_CHECKOUT_ENABLED=true and STRIPE_SECRET_KEY is set.
 * Live keys are refused unless STUDIO_ALLOW_LIVE_STRIPE=true (test mode by default).
 * Note: Studio share links are unsigned, so only enable this for trusted use.
 */
export async function POST(request: NextRequest) {
  if (process.env.STUDIO_CHECKOUT_ENABLED !== 'true' || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Online card payments are not enabled for Invoice Studio.' }, { status: 503 });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (/_live_/.test(key) && process.env.STUDIO_ALLOW_LIVE_STRIPE !== 'true') {
    return NextResponse.json({ error: 'Live Stripe keys are disabled for Invoice Studio.' }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const invoice = typeof body.doc === 'string' ? decodeInvoice(body.doc) : null;
  if (!invoice || invoice.kind !== 'invoice') {
    return NextResponse.json({ error: 'Invalid invoice' }, { status: 400 });
  }
  const { balanceDue } = calcTotals(invoice);
  if (balanceDue <= 0) return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });

  try {
    const back = `${appUrl()}/studio?view=1&doc=${body.doc}`;
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: invoice.business.currency.toLowerCase(),
          unit_amount: amountForStripe(balanceDue, invoice.business.currency),
          product_data: { name: `Invoice ${invoice.number}`, description: invoice.business.name },
        },
      }],
      metadata: { kind: 'studio_invoice', invoiceId: invoice.id, invoiceNumber: invoice.number },
      customer_email: invoice.customer.email || undefined,
      success_url: `${back}&paid=1`,
      cancel_url: back,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout failed' }, { status: 500 });
  }
}

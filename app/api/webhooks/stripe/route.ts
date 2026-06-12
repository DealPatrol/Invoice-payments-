import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    let event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        { error: `Webhook Error: ${message}` },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;

        // Update payment status
        if (session.metadata?.invoiceId) {
          await prisma.payment.updateMany({
            where: {
              invoiceId: session.metadata.invoiceId,
              status: 'pending',
            },
            data: {
              status: 'completed',
              paidAt: new Date(),
            },
          });

          // Update invoice status to paid
          await prisma.invoice.update({
            where: { id: session.metadata.invoiceId },
            data: { status: 'paid' },
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;

        if (paymentIntent.metadata?.invoiceId) {
          await prisma.payment.updateMany({
            where: {
              invoiceId: paymentIntent.metadata.invoiceId,
              stripePaymentIntentId: paymentIntent.id,
            },
            data: { status: 'failed' },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[v0] Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

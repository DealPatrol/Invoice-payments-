import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, amount, currency } = body;

    // Verify invoice belongs to user
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId: session.user.id,
      },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for invoice from ${session.user.email}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/invoices/${invoiceId}?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/invoices/${invoiceId}?payment=cancelled`,
      customer_email: invoice.client?.email,
      metadata: {
        invoiceId: invoice.id,
        userId: session.user.id,
      },
    });

    // Store pending payment in database
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        invoiceId,
        amount,
        method: 'stripe',
        status: 'pending',
        stripePaymentIntentId: checkoutSession.payment_intent as string,
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('[v0] Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

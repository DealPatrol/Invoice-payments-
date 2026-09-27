import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { processStripeEvent } from '@/lib/stripe-webhook';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw error;
  }

  try {
    await processStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    await prisma.webhookEvent.deleteMany({ where: { id: event.id } });
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connectConfig } from './config';
import { platformStripe } from './http';
import { handleConnectEvent } from './service';

/**
 * Stripe Connect webhook ("Events on connected accounts"). Register
 *   https://invoicejot.com/api/connect/webhook
 * for: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed.
 * Secret: STRIPE_CONNECT_WEBHOOK_SECRET (falls back to STRIPE_WEBHOOK_SECRET).
 */
export async function connectWebhook(req: Request): Promise<Response> {
  let secret: string | null;
  let stripe;
  try {
    secret = connectConfig().webhookSecret;
    stripe = platformStripe();
  } catch {
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }
  const signature = req.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  try {
    const r = await handleConnectEvent(stripe, event);
    return NextResponse.json({ received: true, ...r });
  } catch (e) {
    console.error('[connect webhook] failed', event.type, event.id, (e as Error)?.message);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 }); // Stripe retries
  }
}

import Stripe from 'stripe';
import { isPlan, type Plan } from './config';
import { prisma } from './db';
import { recordStripePayment } from './studio-server';

/** Records a paid Invoice Studio checkout (card immediately, ACH on async success). */
async function handleStudioPayment(session: Stripe.Checkout.Session, livemode: boolean) {
  const { studioDocId, userId } = session.metadata ?? {};
  if (!studioDocId || !userId) throw new Error('Studio session is missing metadata');
  if (session.payment_status !== 'paid') return; // ACH still processing
  if (livemode && process.env.STUDIO_ALLOW_LIVE_STRIPE !== 'true') throw new Error('Live Studio payments are disabled');
  await recordStripePayment(studioDocId, userId, {
    date: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    amount: (session.amount_total ?? 0) / 100,
    method: 'Stripe',
    reference: session.id,
  });
}

function planFromSubscription(subscription: Stripe.Subscription): Plan | null {
  const metadataPlan = subscription.metadata.plan;
  if (metadataPlan && isPlan(metadataPlan)) return metadataPlan;
  const priceId = subscription.items.data[0]?.price.id;
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter';
  if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) return 'growth';
  if (priceId === process.env.STRIPE_SCALE_PRICE_ID) return 'scale';
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind === 'invoice_payment' && session.metadata.invoiceId) {
    const invoiceId = session.metadata.invoiceId;
    const userId = session.metadata.userId;
    if (!userId) throw new Error('Invoice payment session is missing user metadata');
    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { stripeCheckoutId: session.id, invoiceId, userId },
        data: {
          status: 'completed',
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          paidAt: new Date(),
        },
      }),
      prisma.invoice.updateMany({
        where: { id: invoiceId, userId },
        data: { status: 'paid', paidDate: new Date() },
      }),
    ]);
    return;
  }

  if (session.metadata?.kind === 'subscription' && session.metadata.userId) {
    const plan = session.metadata.plan;
    if (!plan || !isPlan(plan)) throw new Error('Subscription session has an invalid plan');
    await prisma.user.update({
      where: { id: session.metadata.userId },
      data: {
        plan,
        subscriptionStatus: 'active',
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
        stripeSubscriptionId:
          typeof session.subscription === 'string' ? session.subscription : undefined,
      },
    });
  }
}

async function handleSubscription(subscription: Stripe.Subscription) {
  const plan = planFromSubscription(subscription);
  const userId = subscription.metadata.userId;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const where = userId
    ? { id: userId }
    : { stripeCustomerId: subscription.customer as string };
  await prisma.user.updateMany({
    where,
    data: {
      ...(plan ? { plan } : {}),
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    },
  });
}

export async function processStripeEvent(event: Stripe.Event) {
  if (
    (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
    event.data.object.metadata?.kind === 'studio_invoice'
  ) {
    await handleStudioPayment(event.data.object, event.livemode);
    return;
  }
  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object);
    return;
  }
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    await handleSubscription(event.data.object);
    return;
  }
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await prisma.user.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { subscriptionStatus: 'canceled', currentPeriodEnd: null },
    });
    return;
  }
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    if (typeof invoice.customer === 'string') {
      await prisma.user.updateMany({
        where: { stripeCustomerId: invoice.customer },
        data: { subscriptionStatus: 'past_due' },
      });
    }
    return;
  }
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: { status: 'failed' },
    });
  }
}

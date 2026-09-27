import { randomBytes } from 'crypto';
import { appUrl, isPlan, stripePriceId, type Plan } from './config';
import { prisma } from './db';
import { getStripe } from './stripe';

function integrationIdentifier(): string {
  return `invoiceos_${randomBytes(4).toString('hex').slice(0, 8)}`;
}

export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  requestedPlan: string
) {
  if (!isPlan(requestedPlan)) throw new Error('Invalid plan');
  const plan: Plan = requestedPlan;
  const price = stripePriceId(plan);
  if (!price) throw new Error(`Missing ${plan} Stripe price ID`);

  const stripe = getStripe();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/settings?billing=success`,
    cancel_url: `${appUrl()}/pricing?billing=cancelled`,
    metadata: { kind: 'subscription', userId, plan },
    subscription_data: { metadata: { userId, plan } },
    integration_identifier: integrationIdentifier(),
  });
}

export async function createPortalSession(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.stripeCustomerId) throw new Error('No Stripe customer exists for this account');
  return getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/settings`,
  });
}

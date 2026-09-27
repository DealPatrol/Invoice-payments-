import Stripe from 'stripe';
import { appUrl } from './config';
import { prisma } from './db';
import type { Invoice } from './types';

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to enable payments.');
  }
  return new Stripe(key);
}

const CURRENCY_ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND']);

export function amountForStripe(total: number, currency: string): number {
  const code = currency.toUpperCase();
  if (CURRENCY_ZERO_DECIMAL.has(code)) return Math.round(total);
  return Math.round(total * 100);
}

export async function createCheckoutSession(invoice: Invoice, userId: string) {
  const stripe = getStripe();
  const lateFee =
    invoice.status === 'overdue' && invoice.lateFeePercent
      ? invoice.total * (invoice.lateFeePercent / 100)
      : 0;
  const amountDue = invoice.total + lateFee;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: `Payment for ${invoice.invoiceNumber}`,
          },
          unit_amount: amountForStripe(amountDue, invoice.currency),
        },
        quantity: 1,
      },
    ],
    metadata: {
      kind: 'invoice_payment',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      userId,
    },
    success_url: `${appUrl()}/pay/${invoice.payToken}?paid=1`,
    cancel_url: `${appUrl()}/pay/${invoice.payToken}?cancelled=1`,
    customer_email: invoice.clientEmail || undefined,
  });

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeSessionId: session.id, status: invoice.status === 'draft' ? 'sent' : invoice.status },
    }),
    prisma.payment.create({
      data: {
        userId,
        invoiceId: invoice.id,
        amount: amountDue,
        method: 'stripe',
        status: 'pending',
        stripeCheckoutId: session.id,
      },
    }),
  ]);
  return session;
}

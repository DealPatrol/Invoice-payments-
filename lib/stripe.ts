import Stripe from 'stripe';
import { hasStripe, appUrl } from './config';
import type { Invoice } from './types';

export function getStripe() {
  if (!hasStripe()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const CURRENCY_ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND']);

export function amountForStripe(total: number, currency: string): number {
  const code = currency.toUpperCase();
  if (CURRENCY_ZERO_DECIMAL.has(code)) return Math.round(total);
  return Math.round(total * 100);
}

export async function createCheckoutSession(invoice: Invoice) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to enable payments.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: `Payment for ${invoice.invoiceNumber}`,
          },
          unit_amount: amountForStripe(invoice.total, invoice.currency),
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    },
    success_url: `${appUrl()}/pay/${invoice.payToken}?paid=1`,
    cancel_url: `${appUrl()}/pay/${invoice.payToken}?cancelled=1`,
  });

  return session;
}

import type { Metadata } from 'next';
import { SiteShell } from '@/components/marketing/SiteChrome';

export const metadata: Metadata = { title: 'Invoice payment', robots: { index: false, follow: false } };

const UNAVAILABLE: Record<string, string> = {
  invalid: 'This payment link is not valid. Please ask the business for a new invoice.',
  not_ready: 'This business has not finished setting up card payments yet. Please use the other payment options on the invoice.',
  error: 'Online card payment is not available right now. Please try again later or use the other payment options on the invoice.',
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

/** Where Stripe Checkout sends the invoice payer (the business's client) afterwards. */
export default async function PaidPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const status = one(sp.status);
  const invoice = one(sp.invoice).slice(0, 40);
  const token = one(sp.t);
  let title = 'Thank you';
  let body = 'Your payment went through. The business can see it in their Stripe account, and Stripe emails you a receipt if you entered your email.';
  let retry: string | null = null;
  if (status === 'already') {
    title = 'This invoice is already paid';
    body = 'Stripe shows a completed card payment for this invoice, so there is nothing more to pay. Contact the business if you think this is wrong.';
  } else if (status === 'cancelled') {
    title = 'Payment cancelled';
    body = 'No money was taken. You can try again whenever you are ready.';
    if (/^[A-Za-z0-9_.-]{20,1200}$/.test(token)) retry = `/pay-online/${token}`;
  } else if (status === 'unavailable') {
    title = 'Card payment unavailable';
    body = UNAVAILABLE[one(sp.code)] ?? UNAVAILABLE.error;
  }
  return (
    <SiteShell>
      <main className="wrap page" style={{ maxWidth: 640 }}>
        <div className="eyebrow">{invoice ? `Invoice ${invoice}` : 'Invoice payment'}</div>
        <h1>{title}</h1>
        <p className="lead">{body}</p>
        {retry ? (
          <p>
            <a className="btn" href={retry}>
              Try again
            </a>
          </p>
        ) : null}
        <p className="fine">Payments are processed by Stripe. Invoice Jot does not see or store your card details.</p>
      </main>
    </SiteShell>
  );
}

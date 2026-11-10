import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { PricingCards } from '@/components/marketing/PricingCards';
import { foundingPilotLink } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Pricing | Invoice Laboratory',
  description: 'Free, Solo $19/mo and Pro $29/mo. Try Pro free for 14 days with no card.',
};

export default function PricingPage() {
  return (
    <SiteShell>
      <main className="wrap">
        <section style={{ borderTop: 0 }}>
          <div className="eyebrow">Pricing</div>
          <h2>Pick a plan. Change it anytime.</h2>
          <p className="muted" style={{ marginBottom: 28 }}>Every plan includes unlimited manual estimates and invoices, client approval links and your own price book.</p>
          <PricingCards />
          <div className="card" style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 22 }}>Founding pilot: first 25 shops</h3>
            <p className="muted">Pro at $19/mo for your first 12 months. The code is applied for you at checkout.</p>
            <div className="cta-row"><a className="btn" href={foundingPilotLink()} rel="noopener">Claim a founding spot</a></div>
          </div>
          <p className="fine" style={{ marginTop: 18 }}>
            Prices in USD. Checkout is handled securely by Stripe. After checkout, <Link href="/login?signup=1">create your account</Link> with the same email so we can match your plan.
            Invoice Laboratory takes no cut of the payments you collect.
          </p>
        </section>
      </main>
    </SiteShell>
  );
}

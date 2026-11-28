import type { Metadata } from 'next';
import { SiteShell } from '@/components/marketing/SiteChrome';

export const metadata: Metadata = { title: 'Back to Invoice Jot', robots: { index: false, follow: false } };

/** Stripe onboarding return_url. Sends the user back into the app, which then checks the account status. */
export default function ConnectReturnPage() {
  return (
    <SiteShell>
      <main className="wrap page" style={{ maxWidth: 640 }}>
        <div className="eyebrow">Card payments</div>
        <h1>You’re done with Stripe</h1>
        <p className="lead">Go back to Invoice Jot. It checks your Stripe account and turns on “Pay online” once Stripe approves it, which is usually right away and sometimes takes a day.</p>
        <p>
          <a className="btn" href="invoicejot://stripe/return">
            Open Invoice Jot
          </a>
        </p>
        <p className="fine">If the button does nothing, switch back to Invoice Jot yourself and tap “Check status” under Get paid with card.</p>
      </main>
    </SiteShell>
  );
}

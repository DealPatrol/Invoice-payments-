import type { Metadata } from 'next';
import { SiteShell } from '@/components/marketing/SiteChrome';

export const metadata: Metadata = { title: 'Continue Stripe setup in Invoice Jot', robots: { index: false, follow: false } };

/** Stripe onboarding refresh_url (link expired or already used). Only the app holds the key to make a new one. */
export default function ConnectRefreshPage() {
  return (
    <SiteShell>
      <main className="wrap page" style={{ maxWidth: 640 }}>
        <div className="eyebrow">Card payments</div>
        <h1>That setup link expired</h1>
        <p className="lead">Setup links work once and only for a few minutes. Go back to Invoice Jot and tap “Continue Stripe setup” to get a fresh one. Anything you already entered is saved by Stripe.</p>
        <p>
          <a className="btn" href="invoicejot://stripe/refresh">
            Open Invoice Jot
          </a>
        </p>
      </main>
    </SiteShell>
  );
}

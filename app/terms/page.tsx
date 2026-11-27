import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { LEGAL_UPDATED, supportEmail } from '@/lib/legal';
import { APPLE_STANDARD_EULA_URL } from '@/lib/native/iap';
import { SITE_URL } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Terms of Use | Invoice Jot',
  description: 'Terms for using the Invoice Jot iPhone app and invoicejot.com, including Invoice Jot Pro subscriptions.',
  alternates: { canonical: `${SITE_URL}/terms` },
};

const H2 = { fontSize: 24, marginTop: 32 } as const;

export default function TermsPage() {
  const email = supportEmail();
  return (
    <SiteShell>
      <main className="wrap" style={{ maxWidth: 760, padding: '48px 24px 72px' }}>
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontSize: 40, margin: '8px 0 6px' }}>Terms of Use</h1>
        <p className="fine">Last updated {LEGAL_UPDATED}. Invoice Jot is published by Front Porch Growth.</p>
        <p>Invoice Jot helps you create invoices, estimates and receipts and share them with your own clients. You are responsible for the content, prices and taxes on your documents. Nothing in the app or on this site is legal, tax or accounting advice.</p>

        <h2 style={H2}>Free plan and Invoice Jot Pro</h2>
        <ul>
          <li><b>Free:</b> unlimited drafts, estimates, clients, items and receipts; you can send or export your first 3 invoices. Every invoice you have ever sent stays free to view, re-share and export. Free PDFs include a small “Made with Invoice Jot” line.</li>
          <li><b>Pro:</b> an auto-renewing App Store subscription ($9.99 per month or $59.99 per year in the US; local prices shown in the app) for unlimited invoices and no footer. Payment is charged to your Apple Account at confirmation. It renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in iOS Settings › Apple Account › Subscriptions. Refunds are handled by Apple.</li>
          <li>Apple’s <a href={APPLE_STANDARD_EULA_URL}>Licensed Application End User License Agreement</a> applies to the app in addition to these terms.</li>
        </ul>

        <h2 style={H2}>Getting paid by your clients</h2>
        <p>If you add a payment link to your invoices, your clients pay you directly through that provider under its terms. Invoice Jot is not a party to those transactions and does not hold your money.</p>

        <h2 style={H2}>Your data</h2>
        <p>Your records are stored on your device. Keep backups (Settings › Back up everything) — if you delete the app or lose your phone without a backup, we cannot recover your data. See the <Link href="/privacy">Privacy Policy</Link>.</p>

        <h2 style={H2}>Liability</h2>
        <p>The app and website are provided “as is”. To the extent the law allows, Front Porch Growth is not liable for indirect or consequential losses, or for amounts beyond what you paid for Pro in the previous 12 months.</p>

        <p>
          Contact: <a href={`mailto:${email}`}>{email}</a>.
        </p>
      </main>
    </SiteShell>
  );
}

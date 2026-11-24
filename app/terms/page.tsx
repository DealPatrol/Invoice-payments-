import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { LEGAL_UPDATED, supportEmail } from '@/lib/legal';
import { APPLE_STANDARD_EULA_URL } from '@/lib/native/iap';

export const metadata: Metadata = {
  title: 'Terms of Use | Invoice Laboratory',
  description: 'Terms for using Invoice Laboratory on the web and on iPhone.',
};

export default function TermsPage() {
  const email = supportEmail();
  return (
    <SiteShell>
      <main className="wrap" style={{ maxWidth: 760, padding: '48px 24px 72px' }}>
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontSize: 40, margin: '8px 0 6px' }}>Terms of Use</h1>
        <p className="fine">Last updated {LEGAL_UPDATED}.</p>
        <p>Invoice Laboratory helps contractors write estimates and invoices and collect payment from their own clients. Estimates are drafts you review before sending; nothing in the app is legal or tax advice.</p>
        <h2 style={{ fontSize: 24, marginTop: 32 }}>Subscriptions</h2>
        <ul>
          <li><b>Web:</b> plans are billed by Stripe and can be managed or cancelled from Settings on the web or the link in your Stripe receipt.</li>
          <li><b>iPhone app:</b> Invoice Lab Pro is an auto-renewing App Store subscription billed to your Apple ID. It renews unless cancelled at least 24 hours before the end of the period; manage it in iOS Settings &gt; Apple ID &gt; Subscriptions. Apple&apos;s <a href={APPLE_STANDARD_EULA_URL}>Licensed Application End User License Agreement</a> also applies to the app.</li>
        </ul>
        <h2 style={{ fontSize: 24, marginTop: 32 }}>Your clients&apos; payments</h2>
        <p>Payments your clients make on your invoices go to you through your own payment provider. Invoice Laboratory takes no cut and is not a party to those transactions.</p>
        <h2 style={{ fontSize: 24, marginTop: 32 }}>Your account</h2>
        <p>Keep your password private. You can delete your account at any time in Settings. See the <Link href="/privacy">Privacy Policy</Link> for how data is handled.</p>
        <p>{email ? <>Contact: <a href={`mailto:${email}`}>{email}</a>.</> : <>Contact: use the support link on our App Store page.</>}</p>
      </main>
    </SiteShell>
  );
}

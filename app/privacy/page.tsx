import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { LEGAL_UPDATED, supportEmail } from '@/lib/legal';
import { SITE_URL } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Privacy Policy | Invoice Jot',
  description: 'Invoice Jot is local-first: no account, no tracking, and your invoices stay on your iPhone. Here is exactly what is and is not collected.',
  alternates: { canonical: `${SITE_URL}/privacy` },
};

const H2 = { fontSize: 24, marginTop: 32 } as const;

export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <SiteShell>
      <main className="wrap" style={{ maxWidth: 760, padding: '48px 24px 72px' }}>
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontSize: 40, margin: '8px 0 6px' }}>Privacy Policy</h1>
        <p className="fine">Last updated {LEGAL_UPDATED}. Applies to the Invoice Jot iPhone app and invoicejot.com. Invoice Jot is published by Front Porch Growth.</p>

        <p className="answer">
          <b>Short version:</b> the Invoice Jot iPhone app has no account and no server. Your business profile, clients, invoices, estimates, items and receipt photos are stored only on your iPhone. We do not collect, sell or track them, and there are no ads or analytics SDKs.
        </p>

        <h2 style={H2}>The iPhone app</h2>
        <ul>
          <li><b>Stored on your device only:</b> everything you enter, kept in the app’s private storage with an extra on-device backup copy so iOS storage cleanup cannot erase it.</li>
          <li><b>Leaves your device only when you choose:</b> when you share a PDF, CSV or backup file, it goes wherever you send it (Mail, Messages, AirDrop, Files). We never receive it.</li>
          <li><b>Camera and photos:</b> used only when you tap Take Photo or Choose Photo, to attach a receipt photo or your logo. Photos stay in the app.</li>
          <li><b>Purchases:</b> Invoice Jot Pro is sold by Apple through the App Store. Apple processes payment; the app only reads whether your Apple Account has an active subscription. We never see card details.</li>
          <li><b>Payment links:</b> if you add your own payment link (for example Stripe, Square, PayPal or Venmo), it is printed on your invoices. Payments go from your client to you through that provider; we are not involved.</li>
          <li><b>Review prompt:</b> iOS may show Apple’s standard rating prompt; Apple handles any rating you leave.</li>
        </ul>

        <h2 style={H2}>Deleting your data</h2>
        <p>Because there is no account, there is nothing on our servers to delete. To erase everything, use <b>More › Business &amp; settings › Delete all data on this iPhone</b>, or delete the app. Back up first with “Back up everything (JSON)” if you might need your records. Cancel a Pro subscription in iOS Settings › Apple Account › Subscriptions.</p>

        <h2 style={H2}>invoicejot.com</h2>
        <ul>
          <li>The <Link href="/free-invoice-generator">free invoice generator</Link> builds the PDF in your browser and saves your draft only in your browser’s local storage. Nothing you type is sent to us.</li>
          <li>Our hosting provider (Vercel) keeps standard server logs (such as IP address and pages requested) for security and reliability.</li>
          <li>If you use the separate signed-in web app, the account details and records you enter there are stored with our providers (Vercel hosting, Supabase database, Stripe for web billing, and an email delivery provider for messages you choose to send) only to run that service. You can delete that account in its Settings.</li>
        </ul>

        <h2 style={H2}>Children</h2>
        <p>Invoice Jot is a business tool and is not directed to children under 13.</p>

        <h2 style={H2}>Changes and contact</h2>
        <p>We will update this page if anything changes. Questions: <a href={`mailto:${email}`}>{email}</a>.</p>
        <p className="fine">
          <Link href="/terms">Terms of Use</Link> · <Link href="/support">Support</Link>
        </p>
      </main>
    </SiteShell>
  );
}

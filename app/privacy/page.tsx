import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { LEGAL_UPDATED, supportEmail } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Invoice Laboratory',
  description: 'What Invoice Laboratory collects, why, who processes it, and how to delete it.',
};

export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <SiteShell>
      <main className="wrap" style={{ maxWidth: 760, padding: '48px 24px 72px' }}>
        <div className="eyebrow">Legal</div>
        <h1 style={{ fontSize: 40, margin: '8px 0 6px' }}>Privacy Policy</h1>
        <p className="fine">Last updated {LEGAL_UPDATED}. Applies to invoice-payments-two.vercel.app and the Invoice Lab iPhone app.</p>

        <h2 style={{ fontSize: 24, marginTop: 32 }}>What we collect</h2>
        <ul>
          <li><b>Your account:</b> name, email address and a hashed password.</li>
          <li><b>Your business records:</b> business profile and logo, clients&apos; names, emails, phone numbers and addresses, estimates, invoices, jobs, change orders, price book, and payment records you enter or receive.</li>
          <li><b>Job-site photos</b> you choose to upload for photo estimates.</li>
          <li><b>Subscription status:</b> your plan, and Stripe or App Store transaction identifiers. We never see or store full card numbers.</li>
        </ul>
        <p>We use this data only to run Invoice Laboratory for you. We do not sell it, show ads, or track you across other apps and websites.</p>

        <h2 style={{ fontSize: 24, marginTop: 32 }}>Service providers</h2>
        <ul>
          <li>Vercel (hosting) and Supabase (Postgres database) store and serve the app and your records.</li>
          <li>Stripe processes web subscriptions and, if you turn it on, your clients&apos; online invoice payments.</li>
          <li>Apple processes App Store subscriptions bought in the iPhone app.</li>
          <li>Resend or AgentMail deliver invoice and reminder emails you choose to send.</li>
          <li>Anthropic analyzes job-site photos you submit to draft a photo estimate; photos are sent only when you request an estimate. If enabled, Replicate renders an optional finished-job preview image.</li>
        </ul>

        <h2 style={{ fontSize: 24, marginTop: 32 }}>On your iPhone</h2>
        <p>The iPhone app keeps a copy of your recent clients and invoices, and any offline drafts, on the device so they work without a connection.
          Face ID or passcode checks are performed by iOS; Invoice Laboratory never receives biometric data. Reminder notifications are scheduled locally and never include amounts.</p>

        <h2 style={{ fontSize: 24, marginTop: 32 }}>Your clients</h2>
        <p>Clients who open an invoice, estimate or portal link you send see only the documents you shared with them. You are responsible for having a basis to store your clients&apos; contact details.</p>

        <h2 style={{ fontSize: 24, marginTop: 32 }}>Retention and deletion</h2>
        <p>Your data is kept while your account is open. You can delete your account and all of its data at any time in <b>Settings &gt; Delete account</b> (web or iPhone app).
          Deletion is immediate and cancels any web subscription; App Store subscriptions must be cancelled in iOS Settings &gt; Apple ID &gt; Subscriptions.</p>

        <h2 style={{ fontSize: 24, marginTop: 32 }}>Contact</h2>
        <p>{email ? <>Questions or requests: <a href={`mailto:${email}`}>{email}</a>.</> : <>Questions or requests: use the support link on our App Store page.</>}</p>
        <p className="fine"><Link href="/terms">Terms of Use</Link></p>
      </main>
    </SiteShell>
  );
}

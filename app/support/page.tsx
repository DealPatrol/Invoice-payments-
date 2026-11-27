import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { supportEmail } from '@/lib/legal';
import { SITE_URL, appStoreUrl, faqJsonLd } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Support | Invoice Jot',
  description: 'Help with Invoice Jot: sending invoices, backups, restoring purchases, cancelling Pro and contacting support.',
  alternates: { canonical: `${SITE_URL}/support` },
};

const FAQS = [
  { q: 'Do I need an account?', a: 'No. Open Invoice Jot and tap New invoice. Everything is stored on your iPhone.' },
  { q: 'How do I send an invoice?', a: 'Open the invoice and tap Send invoice PDF. Choose Mail, Messages, AirDrop or Save to Files. The invoice is marked Sent.' },
  { q: 'What is free and what is Pro?', a: 'Free: unlimited drafts, estimates, clients, items and receipts, and your first 3 invoices to send. Past invoices are always free to view and export. Pro ($9.99/month or $59.99/year) unlocks unlimited invoices and removes the PDF footer.' },
  { q: 'How do I restore my Pro subscription on a new iPhone?', a: 'Open the Pro screen (More › Invoice Jot Pro, or Settings) and tap Restore Purchases while signed in to the same Apple Account.' },
  { q: 'How do I cancel Pro?', a: 'In Invoice Jot tap Settings › Manage subscription, or go to iOS Settings › Apple Account › Subscriptions › Invoice Jot. You keep Pro until the end of the paid period.' },
  { q: 'How do I back up or move my data?', a: 'Settings › Back up everything (JSON) and save it to Files or iCloud Drive. On the new phone, Settings › Restore from backup. You can also export CSVs of documents, payments, clients and receipts.' },
  { q: 'How do clients pay me?', a: 'Add your own payment link (Stripe, Square, PayPal or Venmo) in Settings › Getting paid. It prints as a tappable “Pay online” link on every invoice and the money goes straight to you. Then tap Mark paid.' },
  { q: 'Does it work offline?', a: 'Yes. Creating, editing and saving work with no connection. Sharing a PDF needs whatever connection the app you share to needs.' },
  { q: 'How do I delete my data?', a: 'Settings › Delete all data on this iPhone. There is no server copy to delete.' },
];

export default function SupportPage() {
  const email = supportEmail();
  return (
    <SiteShell>
      <JsonLd data={faqJsonLd(FAQS)} />
      <main className="wrap page" style={{ maxWidth: 820 }}>
        <div className="eyebrow">Support</div>
        <h1>How can we help?</h1>
        <p className="lead">
          Email <a href={`mailto:${email}`}>{email}</a> and we will reply within one business day. Include your iPhone model and iOS version if something is not working.
        </p>
        <section style={{ borderTop: 0 }}>
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <section id="download">
          <h2>Get Invoice Jot</h2>
          <p>
            Invoice Jot is on the App Store for iPhone. <a className="web-only" href={appStoreUrl()}>Download on the App Store</a>. No iPhone? Use the <Link href="/free-invoice-generator">free web invoice generator</Link>.
          </p>
        </section>
        <p className="fine">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
        </p>
      </main>
    </SiteShell>
  );
}

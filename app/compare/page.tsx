import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { AppCta } from '@/components/seo/AppCta';
import { SITE_URL, faqJsonLd, softwareAppJsonLd } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Best Invoice App for Small Business? Invoice Jot Compared | Invoice Jot',
  description: 'How Invoice Jot compares with subscription invoice apps, payment-processor invoicing, accounting suites and spreadsheet templates: account, offline use, pricing and getting paid.',
  alternates: { canonical: `${SITE_URL}/compare` },
};

const ROWS: [string, string, string, string, string][] = [
  ['Account required', 'No. Open the app and start.', 'Usually yes (email sign-up)', 'Yes (merchant account)', 'Yes'],
  ['Works offline', 'Yes: everything is stored on your iPhone', 'Varies; many need a connection to sync', 'Mostly online', 'Mostly online'],
  ['Where your data lives', 'On your device; you export it anytime (PDF, CSV, JSON)', 'Vendor cloud', 'Processor cloud', 'Vendor cloud'],
  ['Price', 'Free to start; Pro $9.99/mo or $59.99/yr', 'Monthly subscription after a limit or trial', 'Free to send; per-transaction card fees', 'Monthly subscription'],
  ['Free plan', 'Unlimited drafts and estimates; first 3 invoices free to send; past invoices always free to view and export', 'Varies', 'Yes', 'Sometimes limited'],
  ['Estimates → invoice', 'One tap, deposit carries over', 'Common', 'Common', 'Common'],
  ['Getting paid', 'Your own payment link (Stripe, Square, PayPal, Venmo) printed on every invoice', 'Built-in payments with processing fees', 'Built-in card payments', 'Built-in, usually with fees'],
  ['Best for', 'Solo trades and small businesses who want fast, private, offline invoicing', 'Teams that want cloud sync', 'Businesses already on that processor', 'Full bookkeeping'],
];

const FAQS = [
  { q: 'What is the best invoice app for a small business?', a: 'If you work alone or with a small crew and want to send invoices quickly from your phone without an account, Invoice Jot is built for that. If you need full bookkeeping and payroll, an accounting suite is a better fit.' },
  { q: 'Is there an invoice app with no subscription?', a: 'Invoice Jot is free to use for drafts, estimates, receipts and your first 3 sent invoices, and every invoice you ever made stays free to view and export. Pro removes the limit for $9.99/month or $59.99/year.' },
  { q: 'Do I need an account to use Invoice Jot?', a: 'No. There is no login. Your data is stored on your iPhone and you can back it up to Files at any time.' },
];

export default function ComparePage() {
  return (
    <SiteShell>
      <JsonLd data={softwareAppJsonLd()} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <main className="wrap page">
        <div className="eyebrow">Compare</div>
        <h1>Invoice Jot vs. other ways to invoice</h1>
        <p className="answer">
          <b>Short answer:</b> Invoice Jot is the fast, private option: no account, works offline, data stays on your iPhone, and you get paid through your own payment link. Choose an accounting suite if you need full bookkeeping.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">Invoice Jot</th>
                <th scope="col">Subscription invoice apps</th>
                <th scope="col">Payment-processor invoicing</th>
                <th scope="col">Accounting suites</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r[0]}>
                  <th scope="row">{r[0]}</th>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>{r[3]}</td>
                  <td>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">Category descriptions are general. Features and prices of other products change; check each provider’s site. Updated November 2026.</p>
        <section>
          <h2>Spreadsheet or Word templates?</h2>
          <p>Templates are free but you retype every line and do the math yourself. The <Link href="/free-invoice-generator">free invoice generator</Link> does the math and makes the PDF for you, and the <Link href="/templates">trade templates</Link> start you with typical line items.</p>
        </section>
        <section>
          <h2>FAQ</h2>
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <AppCta />
      </main>
    </SiteShell>
  );
}

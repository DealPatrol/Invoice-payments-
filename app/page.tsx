import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { AppCta } from '@/components/seo/AppCta';
import { TRADES } from '@/lib/seo/trades';
import { INVOICE_HOWTO_STEPS, SITE_URL, appStoreUrl, faqJsonLd, howToJsonLd, softwareAppJsonLd } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Invoice Jot: Estimate Maker & Invoice App for iPhone (No Account)',
  description: 'Make invoices, estimates and receipts on your iPhone in a minute. No sign-up, works offline, PDF in one tap, get paid with your own payment link. Free to start.',
  alternates: { canonical: SITE_URL },
};

const FAQS = [
  { q: 'What is Invoice Jot?', a: 'Invoice Jot is an iPhone app for making invoices, estimates and receipts. It needs no account, works offline, and keeps your data on your phone.' },
  { q: 'Is Invoice Jot free?', a: 'Yes to start: unlimited drafts, estimates, clients and receipts, and your first 3 invoices free to send. Past invoices are always free to view and export. Pro is $9.99/month or $59.99/year for unlimited invoices and no PDF footer.' },
  { q: 'Is there a free trial?', a: 'There is no trial to cancel. The free plan never expires; upgrade only when you need more than 3 sent invoices.' },
  { q: 'How do my clients pay?', a: 'Add your own Stripe, Square, PayPal or Venmo payment link and it appears as a “Pay online” link on every invoice. Money goes straight to you.' },
  { q: 'Can I turn an estimate into an invoice?', a: 'Yes, in one tap. Line items, tax, discount and deposit carry over.' },
];

const FEATURES: [string, string][] = [
  ['No account, ever', 'Open the app and start. Nothing to sign up for, no password to forget.'],
  ['Works offline', 'Create, edit and save invoices in a basement or a field. Everything is on your iPhone.'],
  ['PDF in one tap', 'Send by text, email or AirDrop, or Save to Files. Your logo and color, plus three free PDF styles. Five more styles come with Pro.'],
  ['Estimates → invoices', 'Quote the job, add a deposit, then convert to an invoice when the client says yes.'],
  ['Get paid faster', 'Your payment link prints on every invoice. Mark paid and see what is overdue at a glance.'],
  ['Receipts for tax time', 'Snap expense receipts and export everything to CSV for your bookkeeper.'],
];

export default function HomePage() {
  return (
    <SiteShell>
      <JsonLd data={softwareAppJsonLd()} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd data={howToJsonLd('How to make an invoice on iPhone with Invoice Jot', INVOICE_HOWTO_STEPS)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Invoice Jot', url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png`, email: 'support@invoicejot.com', parentOrganization: { '@type': 'Organization', name: 'Front Porch Growth' } }} />
      <main className="wrap">
        <div className="hero">
          <div>
            <div className="eyebrow">For contractors, trades &amp; small businesses</div>
            <h1>
              Jot it. Send it. <em>Get paid.</em>
            </h1>
            <p className="lead">Make an invoice or estimate on your iPhone in about a minute. No account, works offline, and your records stay on your phone.</p>
            <div className="cta-row">
              <a className="btn web-only" href={appStoreUrl()}>
                Download on the App Store
              </a>
              <Link className="btn ghost" href="/free-invoice-generator">
                Free web invoice generator
              </Link>
            </div>
            <p className="fine">Free: unlimited drafts &amp; estimates, first 3 invoices free to send. Pro $9.99/mo or $59.99/yr. No trial to cancel.</p>
          </div>
          <div className="card" aria-label="Example invoice">
            <div className="est-head">
              <b>Invoice INV-0042</b>
              <span className="muted">Kitchen faucet replacement</span>
            </div>
            <div className="line">
              <span>Service call</span>
              <span>$95.00</span>
            </div>
            <div className="line">
              <span>Labor · 1.5 hr × $110</span>
              <span>$165.00</span>
            </div>
            <div className="line">
              <span>Kitchen faucet</span>
              <span>$189.00</span>
            </div>
            <div className="line">
              <b>Balance due</b>
              <b>$449.00</b>
            </div>
            <p className="fine" style={{ marginTop: 14 }}>
              Pay online: <span style={{ color: 'var(--copper)' }}>your payment link</span>. Sample invoice for illustration.
            </p>
          </div>
        </div>

        <section id="features">
          <div className="eyebrow">Why Invoice Jot</div>
          <h2>Everything you need to bill a job. Nothing you don’t.</h2>
          <div className="grid3">
            {FEATURES.map(([h, p]) => (
              <div className="feature" key={h}>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how">
          <div className="eyebrow">How it works</div>
          <h2>From job done to invoice sent in five steps</h2>
          <ol className="steps">
            {INVOICE_HOWTO_STEPS.map((s) => (
              <li key={s.name}>
                <b>{s.name}.</b> {s.text}
              </li>
            ))}
          </ol>
        </section>

        <section id="pricing">
          <div className="eyebrow">Pricing</div>
          <h2>Honest pricing</h2>
          <div className="grid3">
            <div className="card price">
              <b>Free</b>
              <div className="amt">$0</div>
              <ul>
                <li>Unlimited drafts, estimates, clients &amp; receipts</li>
                <li>Send your first 3 invoices</li>
                <li>Past invoices always free to view &amp; export</li>
              </ul>
            </div>
            <div className="card price feat">
              <b>Pro yearly</b>
              <div className="amt">
                $59.99<small>/year</small>
              </div>
              <ul>
                <li>Unlimited invoices</li>
                <li>No “Made with Invoice Jot” footer</li>
                <li>Cancel anytime in iOS Settings</li>
              </ul>
            </div>
            <div className="card price">
              <b>Pro monthly</b>
              <div className="amt">
                $9.99<small>/month</small>
              </div>
              <ul>
                <li>Everything in Pro</li>
                <li>Billed through your Apple Account</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <div className="eyebrow">Templates</div>
          <h2>Invoice templates for {TRADES.length} trades</h2>
          <ul className="tiles">
            {TRADES.slice(0, 12).map((t) => (
              <li key={t.slug}>
                <Link href={`/templates/${t.slug}`}>
                  {t.name}
                  <small>invoice template</small>
                </Link>
              </li>
            ))}
          </ul>
          <p>
            <Link href="/templates">See all templates →</Link>
          </p>
        </section>

        <section id="faq">
          <div className="eyebrow">FAQ</div>
          <h2>Questions</h2>
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

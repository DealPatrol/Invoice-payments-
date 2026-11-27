import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { AppCta } from '@/components/seo/AppCta';
import { TRADES } from '@/lib/seo/trades';
import { INVOICE_HOWTO_STEPS, SITE_URL, faqJsonLd, howToJsonLd, softwareAppJsonLd } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: `Free Invoice Templates for ${TRADES.length} Trades (PDF) | Invoice Jot`,
  description: `Free invoice and estimate templates for plumbers, electricians, HVAC, handymen, cleaners, landscapers, freelancers and ${TRADES.length - 7}+ more trades. No sign-up.`,
  alternates: { canonical: `${SITE_URL}/templates` },
};

const FAQS = [
  { q: 'Are these invoice templates free?', a: 'Yes. Every template can be filled in with the free web invoice generator with no account, and downloaded as a PDF.' },
  { q: 'Which template should I use?', a: 'Pick your trade for sample line items and tips. Any template works for any business; you can edit every line.' },
  { q: 'Can I make an estimate instead of an invoice?', a: 'Yes. In the Invoice Jot app, create an estimate, then convert it to an invoice in one tap when the client approves.' },
];

export default function TemplatesIndex() {
  return (
    <SiteShell>
      <JsonLd data={softwareAppJsonLd()} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd data={howToJsonLd('How to make an invoice', INVOICE_HOWTO_STEPS)} />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Invoice templates by trade', itemListElement: TRADES.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/templates/${t.slug}`, name: `${t.name} invoice template` })) }} />
      <main className="wrap page">
        <div className="eyebrow">Free, no sign-up</div>
        <h1>Invoice templates by trade</h1>
        <p className="lead">Pick your trade for a ready-made invoice with typical line items, then fill it in free on the web or send it from your iPhone with Invoice Jot.</p>
        <ul className="tiles" style={{ marginTop: 28 }}>
          {TRADES.map((t) => (
            <li key={t.slug}>
              <Link href={`/templates/${t.slug}`}>
                {t.name} invoice template<small>for {t.pros}</small>
              </Link>
            </li>
          ))}
        </ul>
        <section>
          <h2>Template FAQ</h2>
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

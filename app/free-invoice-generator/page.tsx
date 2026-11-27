import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { AppCta } from '@/components/seo/AppCta';
import { FreeInvoiceGenerator } from '@/components/seo/FreeInvoiceGenerator';
import { tradeBySlug } from '@/lib/seo/trades';
import { INVOICE_HOWTO_STEPS, SITE_URL, faqJsonLd, howToJsonLd, softwareAppJsonLd } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Free Invoice Generator: Make a PDF Invoice, No Sign-Up | Invoice Jot',
  description: 'Create a professional invoice or estimate PDF in your browser. Free, no account, nothing uploaded. Add line items, tax and a payment link, then download.',
  alternates: { canonical: `${SITE_URL}/free-invoice-generator` },
};

const FAQS = [
  { q: 'Is the invoice generator really free?', a: 'Yes. There is no account, no trial and no watermark beyond a small “Made with Invoice Jot” line at the bottom of the PDF.' },
  { q: 'Is my data uploaded anywhere?', a: 'No. The PDF is created in your browser and the draft is saved only in this browser’s local storage.' },
  { q: 'Can I add a payment link?', a: 'Yes. Paste your own Stripe, Square, PayPal or Venmo link and it prints as a tappable “Pay online” link on the PDF. Clients pay you directly.' },
  { q: 'How do I invoice from my phone?', a: 'Use the Invoice Jot iPhone app. It saves clients and items, converts estimates to invoices, tracks who has paid, and works offline.' },
];

export default async function FreeGeneratorPage({ searchParams }: { searchParams: Promise<{ trade?: string }> }) {
  const sp = await searchParams;
  const tr = sp.trade ? tradeBySlug(sp.trade) : undefined;
  return (
    <SiteShell>
      <JsonLd data={softwareAppJsonLd({ '@type': 'WebApplication', operatingSystem: 'Any (web browser)', name: 'Invoice Jot Free Invoice Generator', url: `${SITE_URL}/free-invoice-generator` })} />
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd data={howToJsonLd('How to make an invoice online for free', INVOICE_HOWTO_STEPS)} />
      <main className="wrap page">
        <div className="eyebrow">Free · no sign-up · nothing uploaded</div>
        <h1>Free invoice generator{tr ? ` for ${tr.pros}` : ''}</h1>
        <p className="lead">Fill in the form, then download a clean PDF invoice or estimate. {tr ? <>Sample {tr.name.toLowerCase()} lines are filled in; change them to your own prices. </> : null}Need a trade-specific starting point? <Link href="/templates">Browse templates</Link>.</p>
        <section style={{ borderTop: 0, paddingTop: 24 }}>
          <FreeInvoiceGenerator sample={tr ? tr.lines : null} />
        </section>
        <section>
          <h2>Invoice generator FAQ</h2>
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <AppCta heading="Invoice from the job site with Invoice Jot" />
      </main>
    </SiteShell>
  );
}

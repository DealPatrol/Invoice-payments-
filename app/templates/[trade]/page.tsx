import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { AppCta } from '@/components/seo/AppCta';
import { TRADES, sampleTotal, tradeBySlug, tradeFaqs } from '@/lib/seo/trades';
import { INVOICE_HOWTO_STEPS, SITE_URL, breadcrumbJsonLd, faqJsonLd, howToJsonLd, softwareAppJsonLd } from '@/lib/seo/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return TRADES.map((t) => ({ trade: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ trade: string }> }): Promise<Metadata> {
  const { trade } = await params;
  const tr = tradeBySlug(trade);
  if (!tr) return {};
  const title = `Free ${tr.name} Invoice Template (PDF) | Invoice Jot`;
  const description = `Free ${tr.name.toLowerCase()} invoice template with sample line items for ${tr.pros}. Fill it in on the web with no sign-up, or send it from your iPhone with Invoice Jot.`;
  return { title, description, alternates: { canonical: `${SITE_URL}/templates/${tr.slug}` }, openGraph: { title, description, url: `${SITE_URL}/templates/${tr.slug}`, type: 'article' } };
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default async function TradeTemplatePage({ params }: { params: Promise<{ trade: string }> }) {
  const { trade } = await params;
  const tr = tradeBySlug(trade);
  if (!tr) notFound();
  const faqs = tradeFaqs(tr);
  const total = sampleTotal(tr);
  const idx = TRADES.indexOf(tr);
  const related = [1, 2, 3, 4, 5, 6].map((k) => TRADES[(idx + k) % TRADES.length]);
  return (
    <SiteShell>
      <JsonLd data={softwareAppJsonLd()} />
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd data={howToJsonLd(`How to make a ${tr.name.toLowerCase()} invoice`, INVOICE_HOWTO_STEPS)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Templates', path: '/templates' }, { name: `${tr.name} invoice template`, path: `/templates/${tr.slug}` }])} />
      <main className="wrap page">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/templates">Invoice templates</Link> › {tr.name}
        </nav>
        <div className="eyebrow">Free template for {tr.pros}</div>
        <h1>{tr.name} invoice template</h1>
        <p className="answer">
          <b>Quick answer:</b> a {tr.name.toLowerCase()} invoice lists your business and the client, an invoice number and due date, each service or part with quantity × rate, tax, the total and how to pay. Most {tr.pros} bill {tr.billing}.
        </p>
        <div className="cta-row">
          <Link className="btn" href={`/free-invoice-generator?trade=${tr.slug}`}>
            Fill in this template free
          </Link>
          <Link className="btn ghost" href="/templates">
            All {TRADES.length} trade templates
          </Link>
        </div>

        <section>
          <h2>Sample {tr.name.toLowerCase()} invoice</h2>
          <div className="card">
            <div className="est-head">
              <b>Invoice INV-0001</b>
              <span className="muted">{tr.job}</span>
            </div>
            <table className="inv">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tr.lines.map((l) => (
                  <tr key={l.name}>
                    <td>{l.name}</td>
                    <td className="num">
                      {l.qty} {l.unit}
                    </td>
                    <td className="num">{money(l.price)}</td>
                    <td className="num">{money(l.qty * l.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Subtotal (before tax)</td>
                  <td className="num">{money(total)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="fine">Sample prices for illustration only. Set your own rates; Invoice Jot remembers them for next time.</p>
          </div>
        </section>

        <section>
          <h2>How to make a {tr.name.toLowerCase()} invoice in 5 steps</h2>
          <ol className="steps">
            {INVOICE_HOWTO_STEPS.map((s) => (
              <li key={s.name}>
                <b>{s.name}.</b> {s.text}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>Tips for {tr.pros}</h2>
          <ul className="plain">
            {tr.tips.map((x) => (
              <li key={x}>{x}</li>
            ))}
            <li>{tr.deposit}</li>
          </ul>
        </section>

        <section>
          <h2>{tr.name} invoice FAQ</h2>
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section>
          <h2>More templates</h2>
          <ul className="tiles">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/templates/${r.slug}`}>
                  {r.name} invoice<small>for {r.pros}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <AppCta heading={`Send ${tr.name.toLowerCase()} invoices from the job`} />
      </main>
    </SiteShell>
  );
}

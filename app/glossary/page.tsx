import type { Metadata } from 'next';
import { SiteShell } from '@/components/marketing/SiteChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { AppCta } from '@/components/seo/AppCta';
import { SITE_URL } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Invoicing Glossary: Net 30, Deposits, Estimates & More | Invoice Jot',
  description: 'Plain-English definitions of invoicing terms for small businesses: Net 30, due on receipt, deposit, retainer, progress billing, change order, line item, sales tax and more.',
  alternates: { canonical: `${SITE_URL}/glossary` },
};

const GLOSSARY: [string, string][] = [
  ['Invoice', 'A bill you send after work is done or goods are delivered. It lists what was provided, what it costs, and when and how to pay.'],
  ['Estimate', 'A price you give before the work starts. It is not a bill; once the client approves, you turn it into an invoice.'],
  ['Quote', 'Often used like an estimate, but usually a firm price for a defined scope that stays valid for a set time.'],
  ['Line item', 'One row on an invoice: a service or product, its quantity, the rate and the amount (quantity × rate).'],
  ['Invoice number', 'A unique, sequential ID such as INV-0001 that helps you and your client track the bill.'],
  ['Due date', 'The date the payment is expected. It is usually the issue date plus your payment terms.'],
  ['Payment terms', 'The rules for when payment is due, such as Due on receipt, Net 15 or Net 30.'],
  ['Net 30', 'Payment is due 30 days after the invoice date. Net 15 and Net 60 work the same way.'],
  ['Due on receipt', 'Payment is expected as soon as the client receives the invoice.'],
  ['Deposit', 'Money paid up front, before the work starts, often to cover materials or hold a date.'],
  ['Retainer', 'An advance payment that reserves your time or services; often billed monthly for ongoing work.'],
  ['Progress billing', 'Invoicing a large job in stages (milestones) instead of one bill at the end.'],
  ['Change order', 'A written change to an approved job that adjusts the scope and the price.'],
  ['Balance due', 'What is still owed: the total minus any deposits or payments already received.'],
  ['Partial payment', 'A payment for part of an invoice. The remaining balance stays open.'],
  ['Subtotal', 'The sum of all line items before discounts and tax.'],
  ['Sales tax', 'Tax added to taxable goods or services, set by your state and local rules.'],
  ['Discount', 'A reduction from the subtotal, either a percentage or a fixed amount.'],
  ['Late fee', 'A charge added when an invoice is paid after the due date, if your terms and local law allow it.'],
  ['Overdue invoice', 'An invoice that is unpaid after its due date.'],
  ['Accounts receivable', 'Money your customers owe you for invoices you have sent.'],
  ['Receipt', 'Proof that a payment was made. Keep receipts for business expenses for tax time.'],
  ['Payment link', 'A web link (from Stripe, Square, PayPal, Venmo and others) that lets a client pay you online.'],
  ['Pass-through cost', 'A cost you pay on the client’s behalf (like a permit) and bill at cost.'],
  ['Materials allowance', 'A budgeted amount for materials on an estimate; the final invoice reflects actual cost.'],
  ['Pro forma invoice', 'A preliminary bill sent before delivery, mainly used for approvals or customs.'],
  ['Credit memo', 'A document that reduces what a client owes, for example after a return or billing error.'],
  ['W-9', 'A US tax form clients may ask contractors to fill out so they can report payments.'],
  ['1099-NEC', 'A US tax form businesses file to report payments of $600 or more to non-employee contractors (threshold may change; check IRS guidance).'],
];

export default function GlossaryPage() {
  return (
    <SiteShell>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name: 'Invoicing glossary',
          url: `${SITE_URL}/glossary`,
          hasDefinedTerm: GLOSSARY.map(([term, def]) => ({ '@type': 'DefinedTerm', name: term, description: def, url: `${SITE_URL}/glossary#${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` })),
        }}
      />
      <main className="wrap page">
        <div className="eyebrow">Glossary</div>
        <h1>Invoicing terms, in plain English</h1>
        <p className="lead">Short definitions for the words you see on invoices and estimates. Not legal or tax advice.</p>
        <dl className="gloss">
          {GLOSSARY.map(([term, def]) => (
            <div key={term} id={term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
              <dt>{term}</dt>
              <dd>{def}</dd>
            </div>
          ))}
        </dl>
        <AppCta />
      </main>
    </SiteShell>
  );
}

/** Public site + App Store identity for invoicejot.com (SEO / GEO / AEO). */
export const SITE_NAME = 'Invoice Jot';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://invoicejot.com').replace(/\/$/, '');
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@invoicejot.com';
export const APP_TITLE = 'Invoice Jot: Estimate Maker';
export const APP_SUBTITLE = 'Receipts, Quotes & Get Paid';
export const BUNDLE_ID = 'com.frontporchgrowth.invoicejot';

/** Numeric App Store id (set NEXT_PUBLIC_APP_STORE_ID once App Store Connect creates the app). */
export function appStoreId(): string | null {
  const v = process.env.NEXT_PUBLIC_APP_STORE_ID?.trim();
  return v && /^\d+$/.test(v) ? v : null;
}

export function appStoreUrl(): string {
  const id = appStoreId();
  return id ? `https://apps.apple.com/app/id${id}` : '/support#download';
}

export const PRICING = {
  free: 'Free: unlimited drafts, estimates, clients and receipts; send your first 3 invoices.',
  weekly: '$4.99/week',
  monthly: '$9.99/month',
  yearly: '$59.99/year',
};

export function softwareAppJsonLd(extra: Record<string, unknown> = {}) {
  const id = appStoreId();
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    alternateName: APP_TITLE,
    operatingSystem: 'iOS',
    applicationCategory: 'BusinessApplication',
    description: 'Make invoices, estimates and receipts on your iPhone in a minute. No account, works offline, PDF in one tap.',
    url: SITE_URL,
    ...(id ? { downloadUrl: `https://apps.apple.com/app/id${id}`, installUrl: `https://apps.apple.com/app/id${id}` } : {}),
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Invoice Jot Pro (weekly)', price: '4.99', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Invoice Jot Pro (monthly)', price: '9.99', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Invoice Jot Pro (yearly)', price: '59.99', priceCurrency: 'USD' },
    ],
    publisher: { '@type': 'Organization', name: 'Front Porch Growth', url: SITE_URL },
    ...extra,
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function howToJsonLd(name: string, steps: { name: string; text: string }[], totalTime = 'PT2M') {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    totalTime,
    tool: [{ '@type': 'HowToTool', name: 'Invoice Jot (iPhone) or the free web invoice generator' }],
    step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

export const INVOICE_HOWTO_STEPS = [
  { name: 'Add your business', text: 'Enter your business name, email and phone once. Add a logo and a payment link if you have one.' },
  { name: 'Add the client', text: 'Type the client’s name and contact details, or pick a saved client.' },
  { name: 'List the work', text: 'Add each service or part as a line with quantity and rate. Saved items autofill.' },
  { name: 'Add tax, discount or deposit', text: 'Set the tax rate and any discount or deposit; totals update instantly.' },
  { name: 'Send the PDF', text: 'Tap Send to share the invoice PDF by text, email, AirDrop or Save to Files, then mark it paid when the money arrives.' },
];

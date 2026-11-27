import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { TRADES, sampleTotal, tradeFaqs } from '@/lib/seo/trades';
import { faqJsonLd, howToJsonLd, softwareAppJsonLd, INVOICE_HOWTO_STEPS } from '@/lib/seo/site';
import sitemap from '@/app/sitemap';

describe('SEO / AEO content', () => {
  it('has 30+ unique trade templates with sample lines', () => {
    expect(TRADES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(TRADES.map((t) => t.slug)).size).toBe(TRADES.length);
    for (const t of TRADES) {
      expect(t.slug).toMatch(/^[a-z0-9-]+$/);
      expect(t.lines.length).toBeGreaterThan(0);
      expect(sampleTotal(t)).toBeGreaterThan(0);
      expect(tradeFaqs(t)).toHaveLength(5);
    }
  });

  it('emits valid schema.org shapes', () => {
    const app = softwareAppJsonLd();
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.offers.map((o) => o.price)).toEqual(['0', '9.99', '59.99']);
    expect(faqJsonLd([{ q: 'Q', a: 'A' }]).mainEntity[0]).toMatchObject({ '@type': 'Question', acceptedAnswer: { '@type': 'Answer', text: 'A' } });
    expect(howToJsonLd('x', INVOICE_HOWTO_STEPS).step).toHaveLength(5);
  });

  it('sitemap lists every public page and template', () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of ['/free-invoice-generator', '/templates', '/compare', '/glossary', '/support', '/privacy', '/terms']) expect(urls.some((u) => u.endsWith(p))).toBe(true);
    for (const t of TRADES) expect(urls).toContain(`https://invoicejot.com/templates/${t.slug}`);
  });

  it('llms.txt describes the app and links every template', () => {
    const txt = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8');
    expect(txt.startsWith('# Invoice Jot')).toBe(true);
    expect(txt).toContain('$59.99/year');
    for (const t of TRADES) expect(txt).toContain(`/templates/${t.slug}`);
  });
});

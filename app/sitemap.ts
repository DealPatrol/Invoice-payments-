import type { MetadataRoute } from 'next';
import { TRADES } from '@/lib/seo/trades';
import { SITE_URL } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date('2026-11-27');
  const pages = ['', '/free-invoice-generator', '/templates', '/compare', '/glossary', '/support', '/privacy', '/terms'];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.8 })),
    ...TRADES.map((t) => ({ url: `${SITE_URL}/templates/${t.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}

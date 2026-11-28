import { parseFeeBps } from './money';

/** Server-side settings for "Get paid with card". All secrets come from env vars; nothing is hard-coded. */
export interface ConnectConfig {
  siteUrl: string;
  feeBps: number;
  linkSecret: string;
  webhookSecret: string | null;
  allowedOrigins: string[];
}

export class ConnectNotConfigured extends Error {
  constructor(what: string) {
    super(`Card payments are not set up on the server yet (${what}).`);
    this.name = 'ConnectNotConfigured';
  }
}

const DEFAULT_ORIGINS = ['capacitor://localhost', 'ionic://localhost', 'http://localhost:5174', 'http://localhost:3000'];

export function connectConfig(env: Record<string, string | undefined> = process.env): ConnectConfig {
  const linkSecret = env.INVOICEJOT_LINK_SECRET ?? '';
  if (linkSecret.length < 32) throw new ConnectNotConfigured('INVOICEJOT_LINK_SECRET must be at least 32 characters');
  const site = (env.NEXT_PUBLIC_SITE_URL || 'https://invoicejot.com').replace(/\/+$/, '');
  const extra = (env.INVOICEJOT_CONNECT_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    siteUrl: site,
    feeBps: parseFeeBps(env.INVOICEJOT_PLATFORM_FEE_BPS),
    linkSecret,
    webhookSecret: env.STRIPE_CONNECT_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET || null,
    allowedOrigins: [...DEFAULT_ORIGINS, ...extra],
  };
}

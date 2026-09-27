export function isDemoMode() {
  return process.env.DEMO_MODE === 'true';
}

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function appUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export const PRICING = {
  starter: { name: 'Starter', price: 12, invoices: 50, clients: 25, priceEnv: 'STRIPE_STARTER_PRICE_ID' },
  growth: { name: 'Growth', price: 29, invoices: 250, clients: 100, priceEnv: 'STRIPE_GROWTH_PRICE_ID' },
  scale: { name: 'Scale', price: 59, invoices: null, clients: null, priceEnv: 'STRIPE_SCALE_PRICE_ID' },
} as const;

export type Plan = keyof typeof PRICING;

export function isPlan(value: string): value is Plan {
  return value in PRICING;
}

export function stripePriceId(plan: Plan): string | undefined {
  return process.env[PRICING[plan].priceEnv];
}

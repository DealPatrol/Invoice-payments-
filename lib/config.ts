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

/* ---------- Invoice Laboratory plans (marketing + checkout) ---------- */

export const PRODUCT_NAME = 'Invoice Laboratory';

/** Live Stripe Payment Links (public URLs, not secrets). Override per environment if needed. */
export const PLAN_LINKS = {
  solo: process.env.NEXT_PUBLIC_IL_SOLO_LINK || 'https://buy.stripe.com/6oU5kDgYT0iH64d6mhgIo0f',
  pro: process.env.NEXT_PUBLIC_IL_PRO_LINK || 'https://buy.stripe.com/aFacN56kfe9xbox6mhgIo0g',
} as const;

/** Founding pilot promo code (first 25 shops, Pro at $19/mo for 12 months). */
export const FOUNDING_PROMO_CODE = 'ALFOUNDING';

export function foundingPilotLink(): string {
  return `${PLAN_LINKS.pro}?prefilled_promo_code=${FOUNDING_PROMO_CODE}`;
}

export type LabPlanId = 'free' | 'solo' | 'pro';

export interface LabPlan {
  id: LabPlanId;
  name: string;
  price: number;
  blurb: string;
  aiEstimatesPerMonth: number | null; // null = unlimited (fair use)
  features: string[];
  cta: string;
  featured?: boolean;
  note?: string;
}

export const LAB_PLANS: LabPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    blurb: 'Trying it out',
    aiEstimatesPerMonth: 3,
    features: ['Unlimited manual estimates & invoices', '3 photo estimates / month', 'Client approval links', 'Your own price book'],
    cta: 'Start free',
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 19,
    blurb: 'Part-time or new contractor',
    aiEstimatesPerMonth: 40,
    features: ['40 photo estimates / month', 'Price book + your 5 numbers', 'Jobs & photos, reminders', 'Convert estimate to invoice in one tap'],
    cta: 'Choose Solo',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    blurb: 'Full-time solo shop',
    aiEstimatesPerMonth: null,
    features: ['Unlimited photo estimates (fair use)', 'Good / Better / Best options', 'Change orders', 'All 8 invoice layouts, priority help'],
    cta: 'Try Pro free for 14 days',
    featured: true,
    note: 'No card needed to start the trial.',
  },
];

export function planCheckoutHref(id: LabPlanId): string {
  if (id === 'free') return '/login?signup=1';
  return PLAN_LINKS[id];
}

export function hasSupabase() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export const PRICING = {
  starter: { name: 'Starter', price: 12, invoices: 50, clients: 25 },
  growth: { name: 'Growth', price: 29, invoices: 250, clients: 100 },
  scale: { name: 'Scale', price: 59, invoices: 'Unlimited', clients: 'Unlimited' },
} as const;

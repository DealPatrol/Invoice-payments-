import { connectWebhook } from '@/lib/connect/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stripe Connect webhook; see lib/connect/webhook.ts and STRIPE_CONNECT.md. */
export function POST(req: Request) {
  return connectWebhook(req);
}

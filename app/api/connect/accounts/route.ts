import { jsonRoute, preflight } from '@/lib/connect/http';
import { createConnectedAccount } from '@/lib/connect/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {country?, currency?} -> {accountId, accountKey, onboardingUrl}. Creates the user's own Stripe account (Accounts v2). */
export function POST(req: Request) {
  return jsonRoute(req, (body, { cfg, stripe }) => createConnectedAccount(stripe, cfg, { country: body.country, currency: body.currency }));
}
export const OPTIONS = preflight;

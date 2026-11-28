import { jsonRoute, preflight } from '@/lib/connect/http';
import { onboardingLink, requireAccount } from '@/lib/connect/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST {accountId, accountKey} -> {url}. A fresh, single-use Stripe onboarding link. */
export function POST(req: Request) {
  return jsonRoute(req, async (body, { cfg, stripe }) => ({ url: await onboardingLink(stripe, cfg, requireAccount(cfg, body)) }));
}
export const OPTIONS = preflight;

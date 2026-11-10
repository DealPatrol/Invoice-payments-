import { LAB_PLANS, PLAN_LINKS, type LabPlanId } from './config';

/**
 * Invoice Laboratory plan rules.
 * - Everyone starts with 14 days of Pro (no card).
 * - After the trial a shop drops to Free (never locked out): unlimited manual
 *   estimates and invoices, 3 photo estimates a month.
 * - Solo / Pro come from a Stripe subscription (synced by the webhook).
 */
export const TRIAL_DAYS = 14;

/** Stripe Payment Link ids and Price ids for the live Invoice Laboratory plans (public ids, not secrets). */
export const PAYMENT_LINK_PLANS: Record<string, LabPlanId> = {
  plink_1UaAMKI7O0BzBS79OFRsHfFA: 'solo',
  plink_1UaAMMI7O0BzBS79ddyjQpou: 'pro',
};
export const PRICE_PLANS: Record<string, LabPlanId> = {
  price_1UaAM7I7O0BzBS79o2xfxaf2: 'solo',
  price_1UaAMBI7O0BzBS79qfUYCYBi: 'pro',
};

const PAID_STATUSES = new Set(['active', 'trialing', 'past_due']);
const LEGACY_PAID: Record<string, LabPlanId> = { starter: 'solo', growth: 'pro', scale: 'pro' };

export interface PlanUser {
  plan: string;
  subscriptionStatus: string;
  createdAt: Date | string;
}

export interface PlanState {
  plan: LabPlanId;
  onTrial: boolean;
  trialEndsAt: string;
  aiEstimatesPerMonth: number | null;
}

export function trialEndsAt(createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function planState(user: PlanUser, now: Date = new Date()): PlanState {
  const ends = trialEndsAt(user.createdAt);
  const paid = PAID_STATUSES.has(user.subscriptionStatus);
  let plan: LabPlanId = 'free';
  let onTrial = false;
  if (paid && (user.plan === 'solo' || user.plan === 'pro')) plan = user.plan;
  else if (paid && LEGACY_PAID[user.plan]) plan = LEGACY_PAID[user.plan];
  else if (now < ends) { plan = 'pro'; onTrial = true; }
  const limit = LAB_PLANS.find((p) => p.id === plan)?.aiEstimatesPerMonth ?? null;
  return { plan, onTrial, trialEndsAt: ends.toISOString(), aiEstimatesPerMonth: limit };
}

export function monthStartUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export function photoLimitMessage(state: PlanState): string {
  const name = LAB_PLANS.find((p) => p.id === state.plan)?.name ?? 'Your plan';
  return `You've used all ${state.aiEstimatesPerMonth} photo estimates on ${name} this month. Upgrade for more, or write this estimate by hand (manual estimates are unlimited).`;
}

/** Upgrade link that tells the webhook which account paid. */
export function upgradeHref(plan: 'solo' | 'pro', user: { id: string; email?: string | null }): string {
  const url = new URL(PLAN_LINKS[plan]);
  url.searchParams.set('client_reference_id', user.id);
  if (user.email) url.searchParams.set('prefilled_email', user.email);
  return url.toString();
}

/* ---------- Pro-only features (must match what /pricing lists only under Pro) ---------- */

export type ProFeature = 'options' | 'changeOrders' | 'layouts';

export const PRO_FEATURES: Record<ProFeature, { name: string; blurb: string }> = {
  options: { name: 'Good / Better / Best options', blurb: 'Let your client pick between three versions of the job on one estimate.' },
  changeOrders: { name: 'Change orders', blurb: 'Price scope changes after approval and get them signed off.' },
  layouts: { name: 'All 8 invoice layouts', blurb: 'Free and Solo include Modern, Classic Ledger and Bold Trade Header.' },
};

/** Invoice layouts on every plan; the rest are Pro. */
export const BASE_TEMPLATES = ['modern', 'classic', 'bold'] as const;

export function isProTemplate(id: string): boolean {
  return !(BASE_TEMPLATES as readonly string[]).includes(id);
}

/** Pro and the 14-day Pro trial get every feature. */
export function hasProAccess(state: Pick<PlanState, 'plan'>): boolean {
  return state.plan === 'pro';
}

export function proFeatureMessage(feature: ProFeature): string {
  return `${PRO_FEATURES[feature].name} is a Pro feature. Upgrade to Pro ($29/mo) to use it; everything else on this estimate keeps working.`;
}

/** True when a save would create Good/Better/Best options. */
export function usesOptions(items?: Array<{ tier?: string | null }>, selectedTier?: string | null): boolean {
  return Boolean(selectedTier) || Boolean(items?.some((item) => Boolean(item.tier)));
}

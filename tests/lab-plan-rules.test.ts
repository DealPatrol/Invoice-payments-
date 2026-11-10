import { describe, expect, it } from 'vitest';
import { jsonError } from '@/lib/field-http';
import { PlanLimitError, monthStartUtc, photoLimitMessage, planState, trialEndsAt, upgradeHref } from '@/lib/lab-plan';

const now = new Date('2026-11-10T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe('Invoice Laboratory plan rules', () => {
  it('gives new accounts 14 days of Pro with no card', () => {
    const s = planState({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: daysAgo(3) }, now);
    expect(s).toMatchObject({ plan: 'pro', onTrial: true, aiEstimatesPerMonth: null });
    expect(trialEndsAt(daysAgo(3)).toISOString()).toBe(new Date(daysAgo(3).getTime() + 14 * 86_400_000).toISOString());
  });

  it('drops to Free (3 photo estimates) after the trial, not locked out', () => {
    expect(planState({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: daysAgo(20) }, now))
      .toMatchObject({ plan: 'free', onTrial: false, aiEstimatesPerMonth: 3 });
  });

  it('uses the paid plan while the subscription is live', () => {
    expect(planState({ plan: 'solo', subscriptionStatus: 'active', createdAt: daysAgo(60) }, now)).toMatchObject({ plan: 'solo', aiEstimatesPerMonth: 40 });
    expect(planState({ plan: 'pro', subscriptionStatus: 'trialing', createdAt: daysAgo(1) }, now)).toMatchObject({ plan: 'pro', onTrial: false });
    expect(planState({ plan: 'pro', subscriptionStatus: 'canceled', createdAt: daysAgo(60) }, now).plan).toBe('free');
  });

  it('counts the month from the 1st (UTC)', () => {
    expect(monthStartUtc(now).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('builds upgrade links that identify the account', () => {
    const url = new URL(upgradeHref('pro', { id: 'user_1', email: 'a+b@example.com' }));
    expect(url.origin).toBe('https://buy.stripe.com');
    expect(url.searchParams.get('client_reference_id')).toBe('user_1');
    expect(url.searchParams.get('prefilled_email')).toBe('a+b@example.com');
  });

  it('returns 402 with an upgrade hint when the allowance is used up', async () => {
    const state = planState({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: daysAgo(30) }, now);
    const res = jsonError(new PlanLimitError(photoLimitMessage(state)), 'x');
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.upgrade).toBe(true);
    expect(body.error).toMatch(/all 3 photo estimates on Free/);
  });
});

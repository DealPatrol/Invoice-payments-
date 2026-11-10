import { describe, expect, it } from 'vitest';
import { LAB_PLANS, PLAN_LINKS, foundingPilotLink, planCheckoutHref } from '@/lib/config';

describe('Invoice Laboratory plans', () => {
  it('lists free, solo and pro at the agreed prices', () => {
    expect(LAB_PLANS.map((p) => [p.id, p.price])).toEqual([['free', 0], ['solo', 19], ['pro', 29]]);
  });

  it('sends paid plans to Stripe and free to sign-up', () => {
    expect(planCheckoutHref('free')).toBe('/login?signup=1');
    expect(planCheckoutHref('solo')).toMatch(/^https:\/\/buy\.stripe\.com\//);
    expect(planCheckoutHref('pro')).toBe(PLAN_LINKS.pro);
  });

  it('prefills the founding promo code on the Pro link', () => {
    expect(foundingPilotLink()).toBe(`${PLAN_LINKS.pro}?prefilled_promo_code=ALFOUNDING`);
  });
});

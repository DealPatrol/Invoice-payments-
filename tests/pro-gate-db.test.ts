import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ findUser: vi.fn(), count: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUniqueOrThrow: m.findUser }, estimate: { count: m.count } } }));

import { assertProFeature } from '@/lib/plan-usage';

describe('assertProFeature against the account record', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'false');
    m.count.mockResolvedValue(0);
  });

  it('allows an account on the 14-day trial', async () => {
    m.findUser.mockResolvedValue({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: new Date() });
    await expect(assertProFeature('u', 'options')).resolves.toBeUndefined();
  });

  it('blocks Solo and Free with a 402-style PlanLimitError', async () => {
    m.findUser.mockResolvedValue({ plan: 'solo', subscriptionStatus: 'active', createdAt: new Date('2026-01-01') });
    await expect(assertProFeature('u', 'changeOrders')).rejects.toMatchObject({ name: 'PlanLimitError' });
    m.findUser.mockResolvedValue({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: new Date('2026-01-01') });
    await expect(assertProFeature('u', 'options')).rejects.toThrow(/Pro feature/);
  });

  it('allows paid Pro', async () => {
    m.findUser.mockResolvedValue({ plan: 'pro', subscriptionStatus: 'active', createdAt: new Date('2026-01-01') });
    await expect(assertProFeature('u', 'layouts')).resolves.toBeUndefined();
  });
});

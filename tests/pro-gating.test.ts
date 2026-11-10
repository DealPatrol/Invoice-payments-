import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ assertPro: vi.fn(), findUser: vi.fn(), countEstimates: vi.fn() }));

vi.mock('@/lib/plan-usage', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/plan-usage')>();
  return { ...real, assertProFeature: m.assertPro, assertPhotoEstimateAllowed: vi.fn() };
});

import { jsonError } from '@/lib/field-http';
import { createChangeOrder, createEstimateFromPhoto, respondToReview, updateEstimate } from '@/lib/field-service';
import { resetFieldDemo } from '@/lib/field-demo-store';
import { BASE_TEMPLATES, hasProAccess, isProTemplate, PlanLimitError, planState, proFeatureMessage, usesOptions } from '@/lib/lab-plan';
import { saveShopSettings } from '@/lib/shop-settings';

const now = new Date('2026-11-10T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe('Pro-only features match /pricing', () => {
  it('trial and Pro have access; Free and Solo do not', () => {
    expect(hasProAccess(planState({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: daysAgo(2) }, now))).toBe(true);
    expect(hasProAccess(planState({ plan: 'pro', subscriptionStatus: 'active', createdAt: daysAgo(90) }, now))).toBe(true);
    expect(hasProAccess(planState({ plan: 'solo', subscriptionStatus: 'active', createdAt: daysAgo(90) }, now))).toBe(false);
    expect(hasProAccess(planState({ plan: 'starter', subscriptionStatus: 'inactive', createdAt: daysAgo(20) }, now))).toBe(false);
  });

  it('keeps 3 base layouts on every plan and makes the other 5 Pro', () => {
    expect([...BASE_TEMPLATES]).toEqual(['modern', 'classic', 'bold']);
    expect(['minimal', 'receipt', 'itemized', 'editorial', 'mono'].every(isProTemplate)).toBe(true);
    expect(isProTemplate('classic')).toBe(false);
  });

  it('only counts real Good/Better/Best use', () => {
    expect(usesOptions([{ tier: '' }, {}])).toBe(false);
    expect(usesOptions([{ tier: 'good' }])).toBe(true);
    expect(usesOptions(undefined, 'best')).toBe(true);
    expect(usesOptions(undefined, '')).toBe(false);
  });

  it('answers 402 with a friendly upgrade message', async () => {
    const res = jsonError(new PlanLimitError(proFeatureMessage('changeOrders')), 'x');
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/Change orders is a Pro feature/);
  });
});

describe('server checks the gate in the right places', () => {
  const userId = 'demo-user';
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
    resetFieldDemo();
    m.assertPro.mockReset();
    m.assertPro.mockResolvedValue(undefined);
  });

  async function sentEstimateWithOptions() {
    await saveShopSettings(userId, { rates: { laborRate: 100 }, priceBook: [] });
    const drafted = await createEstimateFromPhoto(userId, { notes: 'Replace water heater', images: [], clientId: '1' });
    return updateEstimate(userId, drafted.estimate.id, {
      items: [
        { kind: 'labor', description: 'Install', quantity: 2, unit: 'hr', unitPrice: 100 },
        { kind: 'materials', description: 'Standard', quantity: 1, unit: 'ea', unitPrice: 900, tier: 'good' },
        { kind: 'materials', description: 'Tankless', quantity: 1, unit: 'ea', unitPrice: 2600, tier: 'best' },
      ],
      status: 'sent',
    });
  }

  it('checks Pro when saving options, not for status-only changes', async () => {
    const sent = await sentEstimateWithOptions();
    expect(m.assertPro).toHaveBeenCalledWith(userId, 'options');
    m.assertPro.mockClear();
    await updateEstimate(userId, sent!.id, { status: 'draft' });
    expect(m.assertPro).not.toHaveBeenCalled();
  });

  it('blocks saving options when the gate says no', async () => {
    m.assertPro.mockRejectedValue(new PlanLimitError(proFeatureMessage('options')));
    await expect(sentEstimateWithOptions()).rejects.toThrow(/Good \/ Better \/ Best options is a Pro feature/);
  });

  it('never gates the client approval link, even with options, after the shop drops to Free', async () => {
    const sent = await sentEstimateWithOptions();
    m.assertPro.mockReset();
    m.assertPro.mockRejectedValue(new PlanLimitError('should not be called'));
    const approved = await respondToReview(sent!.reviewToken, { action: 'approve', tier: 'best' });
    expect(approved.status).toBe('approved');
    expect(approved.selectedTier).toBe('best');
    expect(m.assertPro).not.toHaveBeenCalled();
  });

  it('checks Pro before creating a change order', async () => {
    const sent = await sentEstimateWithOptions();
    await respondToReview(sent!.reviewToken, { action: 'approve', tier: 'good' });
    m.assertPro.mockClear();
    m.assertPro.mockRejectedValue(new PlanLimitError(proFeatureMessage('changeOrders')));
    await expect(createChangeOrder(userId, sent!.id, { title: 'Extra valve', items: [{ kind: 'materials', description: 'Valve', quantity: 1, unit: 'ea', unitPrice: 40 }] }))
      .rejects.toThrow(/Change orders is a Pro feature/);
    expect(m.assertPro).toHaveBeenCalledWith(userId, 'changeOrders');
  });
});

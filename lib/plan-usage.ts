import { isDemoMode } from './config';
import { prisma } from './db';
import { monthStartUtc, PlanLimitError, photoLimitMessage, planState, type PlanState } from './lab-plan';

export interface PlanUsage extends PlanState {
  photoEstimatesThisMonth: number;
  remaining: number | null;
  mode: 'demo' | 'postgres';
}

const AI_SOURCES = ['photo', 'demo'];

export async function getPlanUsage(userId: string, now: Date = new Date()): Promise<PlanUsage> {
  if (isDemoMode()) {
    const state = planState({ plan: 'free', subscriptionStatus: 'inactive', createdAt: now }, now);
    return { ...state, photoEstimatesThisMonth: 0, remaining: null, mode: 'demo' };
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, createdAt: true },
  });
  const state = planState(user, now);
  const used = await prisma.estimate.count({
    where: { userId, source: { in: AI_SOURCES }, createdAt: { gte: monthStartUtc(now) } },
  });
  const remaining = state.aiEstimatesPerMonth === null ? null : Math.max(0, state.aiEstimatesPerMonth - used);
  return { ...state, photoEstimatesThisMonth: used, remaining, mode: 'postgres' };
}

/** Throws PlanLimitError when the shop has no photo estimates left this month. */
export async function assertPhotoEstimateAllowed(userId: string): Promise<void> {
  if (isDemoMode()) return;
  const usage = await getPlanUsage(userId);
  if (usage.remaining !== null && usage.remaining <= 0) throw new PlanLimitError(photoLimitMessage(usage));
}

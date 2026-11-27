import { prisma } from './db';
import {
  AppleJwsError,
  appAccountTokenFor,
  decideAppleEntitlement,
  verifyAppleJws,
  type AppleEntitlementStatus,
  type AppleTransaction,
} from './apple-iap';

export class AppleOwnershipError extends Error {
  constructor() {
    super('This App Store subscription belongs to a different Invoice Jot account.');
    this.name = 'AppleOwnershipError';
  }
}

export interface AppliedAppleEntitlement {
  originalTransactionId: string;
  productId: string;
  status: AppleEntitlementStatus;
  expiresAt: string | null;
}

/**
 * Records a verified App Store transaction and recomputes the account's Pro access.
 * Only touches plan fields when Apple is the source of Pro, so a web (Stripe) subscriber
 * is never downgraded by an Apple expiry.
 */
export async function applyAppleTransaction(userId: string, tx: AppleTransaction, now: Date = new Date()): Promise<AppliedAppleEntitlement> {
  const decision = decideAppleEntitlement(tx, now);
  if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== appAccountTokenFor(userId)) throw new AppleOwnershipError();
  const existing = await prisma.appleSubscription.findUnique({ where: { originalTransactionId: tx.originalTransactionId } });
  if (existing && existing.userId !== userId) throw new AppleOwnershipError();

  await prisma.appleSubscription.upsert({
    where: { originalTransactionId: tx.originalTransactionId },
    create: {
      originalTransactionId: tx.originalTransactionId,
      userId,
      productId: tx.productId,
      status: decision.status,
      expiresAt: decision.expiresAt,
      environment: tx.environment ?? 'Production',
      lastTransactionId: tx.transactionId,
    },
    update: {
      productId: tx.productId,
      status: decision.status,
      expiresAt: decision.expiresAt,
      environment: tx.environment ?? 'Production',
      lastTransactionId: tx.transactionId,
    },
  });
  await recomputeApplePlan(userId, now);
  return {
    originalTransactionId: tx.originalTransactionId,
    productId: tx.productId,
    status: decision.status,
    expiresAt: decision.expiresAt?.toISOString() ?? null,
  };
}

async function recomputeApplePlan(userId: string, now: Date) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const active = await prisma.appleSubscription.findFirst({
    where: { userId, status: 'active', expiresAt: { gt: now } },
    orderBy: { expiresAt: 'desc' },
  });
  if (active) {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'pro', subscriptionStatus: 'active', currentPeriodEnd: active.expiresAt },
    });
    return;
  }
  // No Apple entitlement left: end Apple-granted Pro, but leave Stripe-managed plans alone.
  if (!user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: 'expired' } });
  }
}

/** Verify + apply a JWS transaction sent by the app for the signed-in user. */
export async function syncAppleJws(userId: string, jws: string): Promise<AppliedAppleEntitlement> {
  return applyAppleTransaction(userId, verifyAppleJws<AppleTransaction>(jws));
}

/** App Store Server Notification: apply to whichever account already owns the subscription. */
export async function applyAppleNotificationTransaction(tx: AppleTransaction): Promise<AppliedAppleEntitlement | null> {
  const owner = await prisma.appleSubscription.findUnique({ where: { originalTransactionId: tx.originalTransactionId } });
  if (!owner) return null; // first sync from the device links it; nothing to update yet
  return applyAppleTransaction(owner.userId, tx);
}

export { AppleJwsError };

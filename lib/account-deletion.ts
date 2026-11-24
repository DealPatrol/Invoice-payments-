import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * In-app account deletion (App Review Guideline 5.1.1(v)).
 *
 * Deletes every row the account owns, children before parents, inside one transaction.
 * Explicit order matters: Invoice/Job/Estimate -> Client use ON DELETE RESTRICT, and the Studio
 * and ShopSettings tables key on userId without a foreign key, so a bare `user.delete` would
 * either fail or leave data behind.
 *
 * Client payment records belong to the deleting business and are removed with it. The web Stripe
 * subscription (if any) is cancelled first by the route; App Store subscriptions can only be
 * cancelled by the customer in iOS Settings, which the confirmation dialog explains.
 */
export const ACCOUNT_DELETION_STEPS = [
  'changeOrder',
  'sitePhoto',
  'estimate',
  'payment',
  'invoice',
  'job',
  'client',
  'studioDocument',
  'studioPortal',
  'studioWorkspace',
  'shopSettings',
  'appleSubscription',
] as const;

export type AccountDeletionStep = (typeof ACCOUNT_DELETION_STEPS)[number];

export { DELETE_CONFIRMATION_WORD } from './account-deletion-constants';

type Tx = Prisma.TransactionClient;

export async function deleteAccountData(db: PrismaClient, userId: string, email: string): Promise<Record<AccountDeletionStep | 'pendingPlan' | 'user', number>> {
  return db.$transaction(async (tx: Tx) => {
    const where = { userId };
    const counts = {} as Record<AccountDeletionStep | 'pendingPlan' | 'user', number>;
    counts.changeOrder = (await tx.changeOrder.deleteMany({ where })).count;
    counts.sitePhoto = (await tx.sitePhoto.deleteMany({ where })).count;
    counts.estimate = (await tx.estimate.deleteMany({ where })).count;
    counts.payment = (await tx.payment.deleteMany({ where })).count;
    counts.invoice = (await tx.invoice.deleteMany({ where })).count;
    counts.job = (await tx.job.deleteMany({ where })).count;
    counts.client = (await tx.client.deleteMany({ where })).count;
    counts.studioDocument = (await tx.studioDocument.deleteMany({ where })).count;
    counts.studioPortal = (await tx.studioPortal.deleteMany({ where })).count;
    counts.studioWorkspace = (await tx.studioWorkspace.deleteMany({ where })).count;
    counts.shopSettings = (await tx.shopSettings.deleteMany({ where })).count;
    counts.appleSubscription = (await tx.appleSubscription.deleteMany({ where })).count;
    counts.pendingPlan = (await tx.pendingPlan.deleteMany({ where: { email: email.trim().toLowerCase() } })).count;
    counts.user = (await tx.user.deleteMany({ where: { id: userId } })).count;
    return counts;
  });
}

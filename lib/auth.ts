import bcrypt from 'bcryptjs';
import { prisma } from './db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      name,
    },
  });
  return applyPendingPlan(user);
}

/** If this email already bought a plan through a Payment Link, attach it to the new account. */
async function applyPendingPlan<T extends { id: string; email: string }>(user: T): Promise<T> {
  try {
    const pending = await prisma.pendingPlan.findUnique({ where: { email: user.email.toLowerCase() } });
    if (!pending) return user;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: pending.plan,
        subscriptionStatus: 'active',
        stripeCustomerId: pending.stripeCustomerId ?? undefined,
        stripeSubscriptionId: pending.stripeSubscriptionId ?? undefined,
      },
    });
    await prisma.pendingPlan.delete({ where: { email: pending.email } });
  } catch (error) {
    console.warn('Could not apply pending plan', error instanceof Error ? error.message : error);
  }
  return user;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

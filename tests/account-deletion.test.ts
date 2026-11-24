import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ACCOUNT_DELETION_STEPS, deleteAccountData } from '@/lib/account-deletion';

function fakeDb() {
  const calls: Array<{ model: string; where: unknown }> = [];
  const model = (name: string) => ({
    deleteMany: async ({ where }: { where: unknown }) => { calls.push({ model: name, where }); return { count: 1 }; },
  });
  const tx = new Proxy({}, { get: (_t, name: string) => model(name) });
  const db = { $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  return { db, calls };
}

describe('deleteAccountData', () => {
  it('removes every user-owned table, children before parents, the user last', async () => {
    const { db, calls } = fakeDb();
    const counts = await deleteAccountData(db, 'u1', ' Owner@Shop.com ');
    const order = calls.map((c) => c.model);
    expect(order).toEqual([...ACCOUNT_DELETION_STEPS, 'pendingPlan', 'user']);
    // RESTRICT foreign keys: invoices, jobs and estimates must go before clients.
    for (const child of ['invoice', 'job', 'estimate']) expect(order.indexOf(child)).toBeLessThan(order.indexOf('client'));
    expect(calls.find((c) => c.model === 'user')?.where).toEqual({ id: 'u1' });
    expect(calls.find((c) => c.model === 'pendingPlan')?.where).toEqual({ email: 'owner@shop.com' });
    for (const c of calls.filter((x) => !['user', 'pendingPlan'].includes(x.model))) expect(c.where).toEqual({ userId: 'u1' });
    expect(counts.user).toBe(1);
  });
});

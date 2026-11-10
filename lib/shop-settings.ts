/** Server-side storage for shop rates + price book (Prisma, or memory in demo mode). */
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { isDemoMode } from './config';
import { normalizeSettings, type ShopSettings } from './price-book';

const demo = new Map<string, ShopSettings>();

export async function getShopSettings(userId: string): Promise<ShopSettings> {
  if (isDemoMode()) return demo.get(userId) ?? normalizeSettings(null);
  const row = await prisma.shopSettings.findUnique({ where: { userId } });
  return normalizeSettings(row ? { rates: row.rates as never, priceBook: row.priceBook } : null);
}

export async function saveShopSettings(userId: string, input: unknown): Promise<ShopSettings> {
  const next = normalizeSettings((input ?? {}) as never);
  if (isDemoMode()) {
    demo.set(userId, next);
    return next;
  }
  const data = { rates: next.rates as unknown as Prisma.InputJsonValue, priceBook: next.priceBook as unknown as Prisma.InputJsonValue };
  await prisma.shopSettings.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return next;
}

/**
 * Server-side Invoice Studio storage (Prisma). Every query is scoped by userId,
 * except token lookups, which go through unguessable server-issued share tokens.
 */
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { DEFAULT_PROFILE, normalizeInvoice, uid, type BusinessProfile, type CatalogItem, type StudioClient, type StudioInvoice, type StudioPayment } from './studio';
import { calcTotals } from './studio';

export interface StudioSnapshot {
  profile: BusinessProfile | null;
  clients: StudioClient[];
  catalog: CatalogItem[];
  invoices: StudioInvoice[];
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL) && process.env.DEMO_MODE !== 'true';
}

export function newShareToken(): string {
  return randomBytes(24).toString('base64url'); // 192 bits
}

export async function loadSnapshot(userId: string): Promise<StudioSnapshot> {
  const [ws, docs] = await Promise.all([
    prisma.studioWorkspace.findUnique({ where: { userId } }),
    prisma.studioDocument.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);
  return {
    profile: ws ? { ...DEFAULT_PROFILE, ...(ws.profile as object) } : null,
    clients: (ws?.clients as unknown as StudioClient[]) ?? [],
    catalog: (ws?.catalog as unknown as CatalogItem[]) ?? [],
    invoices: docs.map((d) => normalizeInvoice({ ...(d.data as object), shareToken: d.shareToken ?? '' })),
  };
}

/** Upserts the workspace and documents; deletes documents missing from `invoices` when `prune`. */
export async function saveSnapshot(userId: string, snap: StudioSnapshot, prune = true) {
  const ids = snap.invoices.map((i) => i.id);
  const owned = await prisma.studioDocument.findMany({ where: { userId }, select: { id: true } });
  const ownedIds = new Set(owned.map((o) => o.id));
  const taken = await prisma.studioDocument.findMany({ where: { id: { in: ids }, NOT: { userId } }, select: { id: true } });
  if (taken.length) throw new Error('Document id conflict');
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.studioWorkspace.upsert({
      where: { userId },
      create: { userId, profile: json(snap.profile ?? DEFAULT_PROFILE), clients: json(snap.clients), catalog: json(snap.catalog) },
      update: { profile: json(snap.profile ?? DEFAULT_PROFILE), clients: json(snap.clients), catalog: json(snap.catalog) },
    }),
  ];
  for (const inv of snap.invoices) {
    // shareToken and payments recorded by webhooks are server-owned: never overwritten by the client.
    const { shareToken: _ignored, ...data } = inv;
    void _ignored;
    if (ownedIds.has(inv.id)) {
      ops.push(prisma.studioDocument.update({ where: { id: inv.id }, data: { kind: inv.kind, number: inv.number, data: json(data) } }));
    } else {
      ops.push(prisma.studioDocument.create({ data: { id: inv.id, userId, kind: inv.kind, number: inv.number, data: json(data) } }));
    }
  }
  if (prune) ops.push(prisma.studioDocument.deleteMany({ where: { userId, id: { notIn: ids } } }));
  await prisma.$transaction(ops);
}

/** Merge server-recorded Stripe payments back into a client-sent document. */
export function mergeServerPayments(client: StudioInvoice, server: StudioInvoice | null): StudioInvoice {
  if (!server) return client;
  const have = new Set(client.payments.map((p) => p.id));
  const extra = server.payments.filter((p) => p.method === 'Stripe' && !have.has(p.id));
  if (!extra.length) return client;
  const merged = { ...client, payments: [...client.payments, ...extra] };
  return calcTotals(merged).balanceDue <= 0 ? { ...merged, status: 'paid' } : merged;
}

export async function shareDocument(userId: string, id: string): Promise<string | null> {
  const doc = await prisma.studioDocument.findFirst({ where: { id, userId } });
  if (!doc) return null;
  if (doc.shareToken) return doc.shareToken;
  const token = newShareToken();
  await prisma.studioDocument.update({ where: { id }, data: { shareToken: token } });
  return token;
}

export async function revokeShare(userId: string, id: string) {
  await prisma.studioDocument.updateMany({ where: { id, userId }, data: { shareToken: null } });
}

export async function getByToken(token: string): Promise<{ invoice: StudioInvoice; userId: string } | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const doc = await prisma.studioDocument.findUnique({ where: { shareToken: token } });
  if (!doc) return null;
  return { invoice: normalizeInvoice({ ...(doc.data as object), shareToken: token }), userId: doc.userId };
}

async function writeDoc(inv: StudioInvoice) {
  const { shareToken: _t, ...data } = inv;
  void _t;
  await prisma.studioDocument.update({ where: { id: inv.id }, data: { data: json(data) } });
}

export async function respondToEstimate(token: string, action: 'accept' | 'decline', name: string) {
  const found = await getByToken(token);
  if (!found || found.invoice.kind !== 'estimate') return { error: 'Estimate not found', status: 404 } as const;
  const inv = found.invoice;
  if (inv.estimateStatus === 'converted' || inv.estimateStatus === 'accepted' || inv.estimateStatus === 'declined') {
    return { error: `This estimate was already ${inv.estimateStatus}.`, status: 409 } as const;
  }
  const next: StudioInvoice = {
    ...inv,
    estimateStatus: action === 'accept' ? 'accepted' : 'declined',
    clientResponse: { action, name: name.slice(0, 120), at: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  await writeDoc(next);
  return { invoice: next } as const;
}

/** Idempotently records a Stripe payment (keyed by reference) on a Studio invoice. */
export async function recordStripePayment(docId: string, userId: string, payment: Omit<StudioPayment, 'id'>) {
  const doc = await prisma.studioDocument.findFirst({ where: { id: docId, userId } });
  if (!doc) throw new Error(`Studio document ${docId} not found`);
  const inv = normalizeInvoice(doc.data as object);
  if (inv.payments.some((p) => p.reference === payment.reference)) return inv;
  const payments = [...inv.payments, { ...payment, id: uid() }];
  const updated = { ...inv, payments, updatedAt: new Date().toISOString() };
  const paid = calcTotals(updated).balanceDue <= 0;
  const next: StudioInvoice = { ...updated, status: paid ? 'paid' : inv.status === 'draft' ? 'sent' : inv.status };
  await writeDoc(next);
  return next;
}

import { nanoid } from 'nanoid';
import type { Prisma } from '@prisma/client';
import { PRICING, isDemoMode, isPlan } from './config';
import { prisma } from './db';
import { demoStore } from './demo-store';
import {
  assertCanConvert,
  changeOrderInvoiceNotes,
  defaultDueDate,
  defaultValidUntil,
  estimateInvoiceNotes,
  isChangeOrderStatus,
  isEstimateStatus,
  isJobStatus,
  normalizeLine,
  normalizePhases,
  summarize,
  toInvoiceItems,
  toPublicEstimate,
  transitionChangeOrder,
  transitionEstimate,
} from './estimate-domain';
import { demoContractorName, fieldDemo, resetFieldDemo, type DemoEstimate, type DemoJob } from './field-demo-store';
import type {
  ChangeOrderRecord,
  ChangeOrderStatus,
  EstimateListItem,
  EstimateRecord,
  EstimateSource,
  EstimateStatus,
  FieldLine,
  FieldLineInput,
  FieldPhase,
  FieldPhaseInput,
  JobListItem,
  JobRecord,
  JobStatus,
  LineKind,
  PhotoRecord,
  PreviewSource,
  PublicEstimate,
} from './field-types';
import type { DataMode } from './invoice-service';
import { createInvoice } from './invoice-service';
import { buildAfterPreview, draftPhotoEstimate, normalizePhotoImages, type PhotoImage } from './photo-estimate';
import type { Invoice } from './types';

export { resetFieldDemo };

export interface NewClientInput {
  name: string;
  email: string;
  country: string;
  currency: string;
  phone?: string;
  address?: string;
}

export interface CreateJobInput {
  title: string;
  summary?: string;
  siteAddress?: string;
  status?: JobStatus;
  scheduledAt?: string | null;
  clientId?: string;
  client?: NewClientInput;
}

export interface UpdateJobInput {
  title?: string;
  summary?: string;
  siteAddress?: string;
  status?: JobStatus;
  scheduledAt?: string | null;
}

export interface ManualEstimateInput {
  clientId?: string;
  client?: NewClientInput;
  jobId?: string;
  title?: string;
  siteAddress?: string;
  scope?: string;
  notes?: string;
  currency?: string;
  taxRate?: number;
  items?: FieldLineInput[];
  phases?: FieldPhaseInput[];
}

export interface PhotoEstimateInput {
  notes: string;
  images: PhotoImage[];
  clientId?: string;
  client?: NewClientInput;
  jobId?: string;
  siteAddress?: string;
  currency?: string;
  taxRate?: number;
}

export interface UpdateEstimateInput {
  scope?: string;
  notes?: string;
  taxRate?: number;
  validUntil?: string | null;
  status?: EstimateStatus;
  declineReason?: string;
  items?: FieldLineInput[];
  phases?: FieldPhaseInput[];
}

interface ResolvedClient {
  id: string;
  name: string;
  email: string;
  country: string;
  currency: string;
}

const estimateInclude = {
  client: true,
  job: true,
  user: { select: { company: true, name: true, email: true } },
  items: { orderBy: { sortOrder: 'asc' as const } },
  phases: { orderBy: { sortOrder: 'asc' as const } },
  photos: { orderBy: { createdAt: 'asc' as const } },
  changeOrders: {
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
    orderBy: { createdAt: 'asc' as const },
  },
  convertedInvoice: { select: { id: true, invoiceNumber: true } },
} satisfies Prisma.EstimateInclude;

type EstimateRow = Prisma.EstimateGetPayload<{ include: typeof estimateInclude }>;

function contractorFrom(user: { company: string | null; name: string | null; email: string }): string {
  return user.company || user.name || user.email;
}

function asStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asSource(value: string): EstimateSource {
  if (value === 'photo' || value === 'demo' || value === 'manual') return value;
  return 'manual';
}

function asPreview(value: string | null): PreviewSource | null {
  if (value === 'replicate' || value === 'schematic') return value;
  return null;
}

function asLineKind(value: string): LineKind {
  if (value === 'labor' || value === 'materials' || value === 'other') return value;
  return 'other';
}

function mapLine(row: {
  id: string;
  kind: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  shoppingUrl: string | null;
}): FieldLine {
  return {
    id: row.id,
    kind: asLineKind(row.kind),
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    total: row.total,
    shoppingUrl: row.shoppingUrl,
  };
}

function mapChange(row: EstimateRow['changeOrders'][number]): ChangeOrderRecord {
  const status: ChangeOrderStatus = isChangeOrderStatus(row.status) ? row.status : 'draft';
  const resolution = row.resolution === 'amended' || row.resolution === 'invoiced' ? row.resolution : '';
  return {
    id: row.id,
    number: row.number,
    status,
    title: row.title,
    reason: row.reason,
    resolution,
    currency: row.currency,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    invoiceId: row.invoiceId,
    items: row.items.map(mapLine),
  };
}

function mapEstimate(row: EstimateRow): EstimateRecord {
  const status: EstimateStatus = isEstimateStatus(row.status) ? row.status : 'draft';
  return {
    id: row.id,
    estimateNumber: row.estimateNumber,
    status,
    currency: row.currency,
    taxRate: row.taxRate,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    scope: row.scope,
    notes: row.notes,
    assumptions: asStringArray(row.assumptions),
    source: asSource(row.source),
    validUntil: row.validUntil?.toISOString() ?? null,
    reviewToken: row.reviewToken,
    jobId: row.jobId,
    jobTitle: row.job?.title ?? null,
    clientId: row.clientId,
    clientName: row.client.name,
    clientEmail: row.client.email,
    country: row.client.country,
    contractorName: contractorFrom(row.user),
    invoiceId: row.convertedInvoice?.id ?? null,
    invoiceNumber: row.convertedInvoice?.invoiceNumber ?? null,
    previewDataUrl: row.previewDataUrl,
    previewSource: asPreview(row.previewSource),
    items: row.items.map(mapLine),
    phases: row.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      description: phase.description,
      sortOrder: phase.sortOrder,
      durationDays: phase.durationDays,
    })),
    photos: row.photos.map((photo) => ({
      id: photo.id,
      role: photo.role,
      dataUrl: photo.dataUrl,
      caption: photo.caption,
    })),
    changeOrders: row.changeOrders.map(mapChange),
    createdAt: row.createdAt.toISOString(),
  };
}

function toListItem(estimate: EstimateRecord, updatedAt: string): EstimateListItem {
  return {
    id: estimate.id,
    estimateNumber: estimate.estimateNumber,
    status: estimate.status,
    currency: estimate.currency,
    total: estimate.total,
    clientName: estimate.clientName,
    jobId: estimate.jobId,
    jobTitle: estimate.jobTitle,
    source: estimate.source,
    updatedAt,
  };
}

function presentDemoEstimate(estimate: DemoEstimate): EstimateRecord {
  const job = estimate.jobId ? fieldDemo.findJob(estimate.userId, estimate.jobId) : null;
  const { userId: _userId, updatedAt: _updatedAt, ...record } = estimate;
  void _userId;
  void _updatedAt;
  return { ...record, jobTitle: job?.title ?? record.jobTitle };
}

function presentDemoJob(job: DemoJob): JobRecord {
  const client = fieldDemo.findClient(job.userId, job.clientId);
  const estimates = fieldDemo.estimates(job.userId).filter((estimate) => estimate.jobId === job.id);
  return {
    id: job.id,
    title: job.title,
    summary: job.summary,
    siteAddress: job.siteAddress,
    status: job.status,
    scheduledAt: job.scheduledAt,
    clientId: job.clientId,
    clientName: client?.name ?? 'Client',
    clientEmail: client?.email ?? '',
    currency: client?.currency ?? 'USD',
    country: client?.country ?? '',
    createdAt: job.createdAt,
    estimates: estimates.map((estimate) => ({
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      status: estimate.status,
      total: estimate.total,
      currency: estimate.currency,
    })),
    invoices: fieldDemo.invoicesFor(job.userId, job.id).map(({ id, invoiceNumber, status, total }) => ({
      id,
      invoiceNumber,
      status,
      total,
    })),
    photos: estimates.flatMap((estimate) => estimate.photos.filter((photo) => photo.role === 'site')),
  };
}

function nextEstimateNumber(existing: string[]): string {
  const year = new Date().getUTCFullYear();
  const pattern = new RegExp(`^EST-${year}-(\\d+)$`);
  let max = 0;
  for (const value of existing) {
    const match = pattern.exec(value);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `EST-${year}-${String(max + 1).padStart(4, '0')}`;
}

function nextChangeNumber(existing: string[]): string {
  let max = 0;
  for (const value of existing) {
    const match = /^CO-(\d+)$/.exec(value);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `CO-${String(max + 1).padStart(2, '0')}`;
}

function pricedLines(items: FieldLineInput[]): FieldLine[] {
  return items.map((item) => normalizeLine(item, nanoid(10)));
}

function phased(phases: FieldPhaseInput[]): FieldPhase[] {
  return normalizePhases(phases).map((phase) => ({ ...phase, id: nanoid(10) }));
}

function photoRecords(images: PhotoImage[], caption: string): PhotoRecord[] {
  return images.map((image) => ({
    id: nanoid(10),
    role: 'site',
    dataUrl: `data:${image.mediaType};base64,${image.dataBase64}`,
    caption,
  }));
}

async function resolveClient(userId: string, input: { clientId?: string; client?: NewClientInput }): Promise<ResolvedClient> {
  if (isDemoMode()) {
    if (input.clientId) {
      const existing = fieldDemo.findClient(userId, input.clientId);
      if (!existing) throw new Error('Client not found');
      return existing;
    }
    if (!input.client) throw new Error('Choose a client');
    const email = input.client.email.toLowerCase();
    const byEmail = fieldDemo.findClientByEmail(userId, email);
    if (byEmail) return byEmail;
    return fieldDemo.insertClient({
      id: `client_${nanoid(8)}`,
      userId,
      name: input.client.name.trim(),
      email,
      country: input.client.country.trim(),
      currency: input.client.currency.toUpperCase(),
      phone: input.client.phone?.trim() ?? '',
      address: input.client.address?.trim() ?? '',
    });
  }

  if (input.clientId) {
    const existing = await prisma.client.findFirst({ where: { id: input.clientId, userId } });
    if (!existing) throw new Error('Client not found');
    return existing;
  }
  if (!input.client) throw new Error('Choose a client');
  const email = input.client.email.toLowerCase();
  const existing = await prisma.client.findUnique({ where: { userId_email: { userId, email } } });
  if (existing) return existing;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const plan = isPlan(user.plan) ? user.plan : 'starter';
  const limit = PRICING[plan].clients;
  if (limit !== null) {
    const count = await prisma.client.count({ where: { userId } });
    if (count >= limit) throw new Error(`${PRICING[plan].name} allows ${limit} clients`);
  }
  return prisma.client.create({
    data: {
      userId,
      name: input.client.name.trim(),
      email,
      country: input.client.country.trim(),
      currency: input.client.currency.toUpperCase(),
      phone: input.client.phone?.trim(),
      address: input.client.address?.trim(),
    },
  });
}

function demoJobList(userId: string): JobListItem[] {
  return fieldDemo.jobs(userId)
    .map((job) => {
      const presented = presentDemoJob(job);
      const open = presented.estimates.filter((estimate) => estimate.status === 'draft' || estimate.status === 'sent' || estimate.status === 'approved');
      return {
        id: job.id,
        title: job.title,
        siteAddress: job.siteAddress,
        status: job.status,
        scheduledAt: job.scheduledAt,
        clientName: presented.clientName,
        currency: presented.currency,
        estimateCount: presented.estimates.length,
        openEstimateTotal: open.reduce((sum, estimate) => sum + estimate.total, 0),
        updatedAt: job.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listJobs(userId: string): Promise<{ jobs: JobListItem[]; mode: DataMode }> {
  if (isDemoMode()) return { jobs: demoJobList(userId), mode: 'demo' };
  const jobs = await prisma.job.findMany({
    where: { userId },
    include: {
      client: { select: { name: true, currency: true } },
      estimates: { select: { status: true, total: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return {
    mode: 'postgres',
    jobs: jobs.map((job) => {
      const open = job.estimates.filter((estimate) => estimate.status === 'draft' || estimate.status === 'sent' || estimate.status === 'approved');
      return {
        id: job.id,
        title: job.title,
        siteAddress: job.siteAddress,
        status: isJobStatus(job.status) ? job.status : 'open',
        scheduledAt: job.scheduledAt?.toISOString() ?? null,
        clientName: job.client.name,
        currency: job.client.currency,
        estimateCount: job.estimates.length,
        openEstimateTotal: open.reduce((sum, estimate) => sum + estimate.total, 0),
        updatedAt: job.updatedAt.toISOString(),
      };
    }),
  };
}

export async function getJob(userId: string, id: string): Promise<JobRecord | null> {
  if (isDemoMode()) {
    const job = fieldDemo.findJob(userId, id);
    return job ? presentDemoJob(job) : null;
  }
  const job = await prisma.job.findFirst({
    where: { id, userId },
    include: {
      client: true,
      estimates: { select: { id: true, estimateNumber: true, status: true, total: true, currency: true } },
      invoices: { select: { id: true, invoiceNumber: true, status: true, total: true }, orderBy: { createdAt: 'desc' } },
      photos: { where: { role: 'site' }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!job) return null;
  return {
    id: job.id,
    title: job.title,
    summary: job.summary,
    siteAddress: job.siteAddress,
    status: isJobStatus(job.status) ? job.status : 'open',
    scheduledAt: job.scheduledAt?.toISOString() ?? null,
    clientId: job.clientId,
    clientName: job.client.name,
    clientEmail: job.client.email,
    currency: job.client.currency,
    country: job.client.country,
    createdAt: job.createdAt.toISOString(),
    estimates: job.estimates.map((estimate) => ({
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      status: isEstimateStatus(estimate.status) ? estimate.status : 'draft',
      total: estimate.total,
      currency: estimate.currency,
    })),
    invoices: job.invoices,
    photos: job.photos.map((photo) => ({ id: photo.id, role: photo.role, dataUrl: photo.dataUrl, caption: photo.caption })),
  };
}

function parseWhen(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Enter a valid date');
  return date;
}

export async function createJob(userId: string, input: CreateJobInput): Promise<JobRecord> {
  const title = input.title.trim();
  if (!title) throw new Error('Give the job a title');
  const client = await resolveClient(userId, input);
  const status = input.status && isJobStatus(input.status) ? input.status : 'open';
  const now = new Date().toISOString();
  if (isDemoMode()) {
    const job: DemoJob = {
      id: `job_${nanoid(8)}`,
      userId,
      clientId: client.id,
      title,
      summary: input.summary?.trim() ?? '',
      siteAddress: input.siteAddress?.trim() ?? '',
      status,
      scheduledAt: input.scheduledAt ? parseWhen(input.scheduledAt)?.toISOString() ?? null : null,
      createdAt: now,
      updatedAt: now,
    };
    fieldDemo.insertJob(job);
    return presentDemoJob(job);
  }
  const job = await prisma.job.create({
    data: {
      userId,
      clientId: client.id,
      title,
      summary: input.summary?.trim() ?? '',
      siteAddress: input.siteAddress?.trim() ?? '',
      status,
      scheduledAt: parseWhen(input.scheduledAt),
    },
  });
  const loaded = await getJob(userId, job.id);
  if (!loaded) throw new Error('Job not found');
  return loaded;
}

export async function updateJob(userId: string, id: string, input: UpdateJobInput): Promise<JobRecord | null> {
  if (input.status && !isJobStatus(input.status)) throw new Error('Unknown job status');
  if (isDemoMode()) {
    const job = fieldDemo.findJob(userId, id);
    if (!job) return null;
    const next: DemoJob = {
      ...job,
      title: input.title?.trim() || job.title,
      summary: input.summary !== undefined ? input.summary.trim() : job.summary,
      siteAddress: input.siteAddress !== undefined ? input.siteAddress.trim() : job.siteAddress,
      status: input.status ?? job.status,
      scheduledAt: input.scheduledAt !== undefined ? (parseWhen(input.scheduledAt)?.toISOString() ?? null) : job.scheduledAt,
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceJob(next);
    return presentDemoJob(next);
  }
  const existing = await prisma.job.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await prisma.job.update({
    where: { id },
    data: {
      title: input.title?.trim() || undefined,
      summary: input.summary !== undefined ? input.summary.trim() : undefined,
      siteAddress: input.siteAddress !== undefined ? input.siteAddress.trim() : undefined,
      status: input.status,
      scheduledAt: input.scheduledAt !== undefined ? parseWhen(input.scheduledAt) : undefined,
    },
  });
  return getJob(userId, id);
}

export async function listEstimates(
  userId: string,
  filters?: { status?: string; search?: string },
): Promise<{ estimates: EstimateListItem[]; mode: DataMode }> {
  if (isDemoMode()) {
    let estimates = fieldDemo.estimates(userId).map((estimate) => toListItem(presentDemoEstimate(estimate), estimate.updatedAt));
    if (filters?.status && filters.status !== 'all') {
      estimates = estimates.filter((estimate) => estimate.status === filters.status);
    }
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      estimates = estimates.filter((estimate) =>
        estimate.estimateNumber.toLowerCase().includes(query)
        || estimate.clientName.toLowerCase().includes(query)
        || (estimate.jobTitle ?? '').toLowerCase().includes(query));
    }
    return { estimates, mode: 'demo' };
  }
  const rows = await prisma.estimate.findMany({
    where: {
      userId,
      ...(filters?.status && filters.status !== 'all' ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { estimateNumber: { contains: filters.search, mode: 'insensitive' } },
              { client: { name: { contains: filters.search, mode: 'insensitive' } } },
              { job: { title: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { client: { select: { name: true } }, job: { select: { title: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return {
    mode: 'postgres',
    estimates: rows.map((row) => ({
      id: row.id,
      estimateNumber: row.estimateNumber,
      status: isEstimateStatus(row.status) ? row.status : 'draft',
      currency: row.currency,
      total: row.total,
      clientName: row.client.name,
      jobId: row.jobId,
      jobTitle: row.job?.title ?? null,
      source: asSource(row.source),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

async function loadEstimate(userId: string, id: string): Promise<EstimateRecord | null> {
  if (isDemoMode()) {
    const estimate = fieldDemo.findEstimate(userId, id);
    return estimate ? presentDemoEstimate(estimate) : null;
  }
  const row = await prisma.estimate.findFirst({ where: { id, userId }, include: estimateInclude });
  return row ? mapEstimate(row) : null;
}

export async function getEstimate(userId: string, id: string): Promise<EstimateRecord | null> {
  return loadEstimate(userId, id);
}

async function persistDemoEstimate(estimate: DemoEstimate): Promise<EstimateRecord> {
  fieldDemo.insertEstimate(estimate);
  if (estimate.jobId) {
    const job = fieldDemo.findJob(estimate.userId, estimate.jobId);
    if (job) fieldDemo.replaceJob({ ...job, updatedAt: estimate.updatedAt });
  }
  return presentDemoEstimate(estimate);
}

async function createJobForClient(userId: string, client: ResolvedClient, title: string, summary: string, siteAddress: string): Promise<string> {
  const job = await createJob(userId, { title, summary, siteAddress, clientId: client.id });
  return job.id;
}

export async function createManualEstimate(userId: string, input: ManualEstimateInput): Promise<EstimateRecord> {
  const client = await resolveClient(userId, input);
  const items = pricedLines(input.items?.length ? input.items : [{
    kind: 'labor',
    description: 'Labor',
    quantity: 1,
    unit: 'hr',
    unitPrice: 0,
  }]);
  const phases = phased(input.phases ?? []);
  const totals = summarize(items, input.taxRate ?? 0);
  const currency = (input.currency || client.currency).toUpperCase();
  const title = input.title?.trim() || 'New job';
  const jobId = input.jobId ?? await createJobForClient(userId, client, title, input.scope?.trim() ?? '', input.siteAddress?.trim() ?? '');
  await assertJobClient(userId, jobId, client.id);
  const now = new Date().toISOString();
  if (isDemoMode()) {
    const numbers = fieldDemo.estimates(userId).map((estimate) => estimate.estimateNumber);
    const job = fieldDemo.findJob(userId, jobId);
    const estimate: DemoEstimate = {
      id: `est_${nanoid(8)}`,
      userId,
      estimateNumber: nextEstimateNumber(numbers),
      status: 'draft',
      currency,
      taxRate: totals.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      scope: input.scope?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      assumptions: [],
      source: 'manual',
      validUntil: defaultValidUntil(),
      reviewToken: nanoid(24),
      jobId,
      jobTitle: job?.title ?? title,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      country: client.country,
      contractorName: demoContractorName(),
      invoiceId: null,
      invoiceNumber: null,
      previewDataUrl: null,
      previewSource: null,
      items,
      phases,
      photos: [],
      changeOrders: [],
      createdAt: now,
      updatedAt: now,
    };
    return persistDemoEstimate(estimate);
  }
  const numbers = await prisma.estimate.findMany({ where: { userId }, select: { estimateNumber: true } });
  const row = await prisma.estimate.create({
    data: {
      userId,
      clientId: client.id,
      jobId,
      estimateNumber: nextEstimateNumber(numbers.map((estimate) => estimate.estimateNumber)),
      reviewToken: nanoid(24),
      currency,
      taxRate: totals.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      scope: input.scope?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      assumptions: [],
      source: 'manual',
      validUntil: new Date(defaultValidUntil()),
      items: { create: itemCreates(items) },
      phases: { create: phaseCreates(phases) },
    },
    include: estimateInclude,
  });
  return mapEstimate(row);
}

function itemCreates(items: FieldLine[]) {
  return items.map((item, index) => ({
    kind: item.kind,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    total: item.total,
    shoppingUrl: item.shoppingUrl,
    sortOrder: index,
  }));
}

function phaseCreates(phases: FieldPhase[]) {
  return phases.map((phase) => ({
    name: phase.name,
    description: phase.description,
    sortOrder: phase.sortOrder,
    durationDays: phase.durationDays,
  }));
}

async function assertJobClient(userId: string, jobId: string, clientId: string): Promise<void> {
  if (isDemoMode()) {
    const job = fieldDemo.findJob(userId, jobId);
    if (!job) throw new Error('Job not found');
    if (job.clientId !== clientId) throw new Error('Job belongs to a different client');
    return;
  }
  const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new Error('Job not found');
  if (job.clientId !== clientId) throw new Error('Job belongs to a different client');
}

export async function createEstimateFromPhoto(
  userId: string,
  input: PhotoEstimateInput,
): Promise<{ estimate: EstimateRecord; source: 'anthropic' | 'demo'; mode: DataMode }> {
  const notes = input.notes.trim();
  const images = normalizePhotoImages(input.images);
  if (!notes && images.length === 0) throw new Error('Add a photo or describe the job');
  const client = await resolveClient(userId, input);
  const currency = (input.currency || client.currency).toUpperCase();
  const drafted = await draftPhotoEstimate({
    notes,
    currency,
    clientName: client.name,
    images,
  });
  const items = pricedLines(drafted.draft.items);
  const phases = phased(drafted.draft.phases);
  const totals = summarize(items, input.taxRate ?? 0);
  const photos = photoRecords(images, 'Site photo');
  const source: EstimateSource = drafted.source === 'anthropic' ? 'photo' : 'demo';
  let jobId = input.jobId;
  if (jobId) await assertJobClient(userId, jobId, client.id);
  else jobId = await createJobForClient(userId, client, drafted.draft.title, drafted.draft.scope, input.siteAddress?.trim() ?? '');
  const now = new Date().toISOString();

  if (isDemoMode()) {
    const numbers = fieldDemo.estimates(userId).map((estimate) => estimate.estimateNumber);
    const job = fieldDemo.findJob(userId, jobId);
    const estimate: DemoEstimate = {
      id: `est_${nanoid(8)}`,
      userId,
      estimateNumber: nextEstimateNumber(numbers),
      status: 'draft',
      currency,
      taxRate: totals.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      scope: drafted.draft.scope,
      notes,
      assumptions: drafted.draft.assumptions,
      source,
      validUntil: defaultValidUntil(),
      reviewToken: nanoid(24),
      jobId,
      jobTitle: job?.title ?? drafted.draft.title,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      country: client.country,
      contractorName: demoContractorName(),
      invoiceId: null,
      invoiceNumber: null,
      previewDataUrl: null,
      previewSource: null,
      items,
      phases,
      photos,
      changeOrders: [],
      createdAt: now,
      updatedAt: now,
    };
    return { estimate: await persistDemoEstimate(estimate), source: drafted.source, mode: 'demo' };
  }

  const numbers = await prisma.estimate.findMany({ where: { userId }, select: { estimateNumber: true } });
  const row = await prisma.estimate.create({
    data: {
      userId,
      clientId: client.id,
      jobId,
      estimateNumber: nextEstimateNumber(numbers.map((estimate) => estimate.estimateNumber)),
      reviewToken: nanoid(24),
      currency,
      taxRate: totals.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      scope: drafted.draft.scope,
      notes,
      assumptions: drafted.draft.assumptions,
      source,
      validUntil: new Date(defaultValidUntil()),
      items: { create: itemCreates(items) },
      phases: { create: phaseCreates(phases) },
      photos: {
        create: photos.map((photo) => ({
          userId,
          jobId,
          mimeType: photo.dataUrl.slice(5, photo.dataUrl.indexOf(';')) || 'image/jpeg',
          dataUrl: photo.dataUrl,
          caption: photo.caption,
          role: photo.role,
        })),
      },
    },
    include: estimateInclude,
  });
  return { estimate: mapEstimate(row), source: drafted.source, mode: 'postgres' };
}

export async function updateEstimate(userId: string, id: string, input: UpdateEstimateInput): Promise<EstimateRecord | null> {
  const current = await loadEstimate(userId, id);
  if (!current) return null;
  const editing = input.items || input.phases || input.scope !== undefined || input.notes !== undefined || input.taxRate !== undefined || input.validUntil !== undefined;
  if (editing && current.status !== 'draft') {
    throw new Error('Only a draft estimate can be edited. Move it back to draft first.');
  }
  let status = current.status;
  if (input.status) status = transitionEstimate(current.status, input.status);
  const items = input.items ? pricedLines(input.items) : current.items;
  const phases = input.phases ? phased(input.phases) : current.phases;
  const totals = summarize(items, input.taxRate ?? current.taxRate);
  const now = new Date();

  if (isDemoMode()) {
    const stored = fieldDemo.findEstimate(userId, id);
    if (!stored) return null;
    const next: DemoEstimate = {
      ...stored,
      status,
      scope: input.scope !== undefined ? input.scope.trim() : stored.scope,
      notes: input.notes !== undefined ? input.notes.trim() : stored.notes,
      taxRate: totals.taxRate,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      validUntil: input.validUntil !== undefined ? input.validUntil : stored.validUntil,
      items,
      phases,
      updatedAt: now.toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return presentDemoEstimate(next);
  }

  await prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.estimateItem.deleteMany({ where: { estimateId: id } });
    }
    if (input.phases) {
      await tx.estimatePhase.deleteMany({ where: { estimateId: id } });
    }
    await tx.estimate.update({
      where: { id },
      data: {
        status,
        scope: input.scope !== undefined ? input.scope.trim() : undefined,
        notes: input.notes !== undefined ? input.notes.trim() : undefined,
        taxRate: totals.taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        validUntil: input.validUntil !== undefined ? parseWhen(input.validUntil) : undefined,
        sentAt: status === 'sent' && current.status !== 'sent' ? now : undefined,
        approvedAt: status === 'approved' && current.status !== 'approved' ? now : undefined,
        declinedAt: status === 'declined' && current.status !== 'declined' ? now : undefined,
        declineReason: input.declineReason?.trim() || undefined,
        items: input.items ? { create: itemCreates(items) } : undefined,
        phases: input.phases ? { create: phaseCreates(phases) } : undefined,
      },
    });
  });
  return loadEstimate(userId, id);
}

function invoiceInput(estimate: EstimateRecord, notes: string, items: FieldLine[]) {
  return {
    clientId: estimate.clientId,
    clientName: estimate.clientName,
    clientEmail: estimate.clientEmail,
    country: estimate.country,
    currency: estimate.currency,
    dueDate: defaultDueDate(),
    notes,
    taxRate: estimate.taxRate,
    items: toInvoiceItems(items),
    jobId: estimate.jobId ?? undefined,
  };
}

function rememberDemoInvoice(userId: string, estimate: EstimateRecord, invoice: Invoice) {
  demoStore.attachOrigin(invoice.id, {
    jobId: estimate.jobId ?? undefined,
    jobTitle: estimate.jobTitle ?? undefined,
    estimateId: estimate.id,
    estimateNumber: estimate.estimateNumber,
  });
  if (estimate.jobId) {
    fieldDemo.rememberInvoice(userId, estimate.jobId, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      total: invoice.total,
    });
  }
}

export async function convertEstimateToInvoice(userId: string, id: string): Promise<{ estimate: EstimateRecord; invoice: Invoice }> {
  const estimate = await loadEstimate(userId, id);
  if (!estimate) throw new Error('Estimate not found');
  assertCanConvert(estimate.status, Boolean(estimate.invoiceId));
  const input = invoiceInput(estimate, estimateInvoiceNotes(estimate), estimate.items);
  if (isDemoMode()) {
    const { invoice } = await createInvoice(userId, input);
    rememberDemoInvoice(userId, estimate, invoice);
    const stored = fieldDemo.findEstimate(userId, id);
    if (!stored) throw new Error('Estimate not found');
    const next: DemoEstimate = {
      ...stored,
      status: 'converted',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return { estimate: presentDemoEstimate(next), invoice };
  }
  const { invoice } = await createInvoice(userId, { ...input, linkEstimateId: id });
  const updated = await loadEstimate(userId, id);
  if (!updated) throw new Error('Estimate not found');
  return { estimate: updated, invoice };
}

export async function createChangeOrder(
  userId: string,
  estimateId: string,
  input: { title: string; reason?: string; items: FieldLineInput[] },
): Promise<EstimateRecord> {
  const estimate = await loadEstimate(userId, estimateId);
  if (!estimate) throw new Error('Estimate not found');
  if (estimate.status === 'declined') throw new Error('This estimate was declined');
  const items = pricedLines(input.items);
  const totals = summarize(items, estimate.taxRate);
  const number = nextChangeNumber(estimate.changeOrders.map((change) => change.number));
  const title = input.title.trim();
  if (!title) throw new Error('Name the change order');
  if (isDemoMode()) {
    const stored = fieldDemo.findEstimate(userId, estimateId);
    if (!stored) throw new Error('Estimate not found');
    const change: ChangeOrderRecord = {
      id: `co_${nanoid(8)}`,
      number,
      status: 'draft',
      title,
      reason: input.reason?.trim() ?? '',
      resolution: '',
      currency: estimate.currency,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      invoiceId: null,
      items,
    };
    const next: DemoEstimate = {
      ...stored,
      changeOrders: [...stored.changeOrders, change],
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return presentDemoEstimate(next);
  }
  await prisma.changeOrder.create({
    data: {
      userId,
      estimateId,
      jobId: estimate.jobId,
      number,
      title,
      reason: input.reason?.trim() ?? '',
      currency: estimate.currency,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      items: { create: itemCreates(items) },
    },
  });
  const updated = await loadEstimate(userId, estimateId);
  if (!updated) throw new Error('Estimate not found');
  return updated;
}

export async function updateChangeOrderStatus(
  userId: string,
  id: string,
  status: ChangeOrderStatus,
): Promise<EstimateRecord> {
  if (isDemoMode()) {
    const estimate = fieldDemo.estimates(userId).find((item) => item.changeOrders.some((change) => change.id === id));
    if (!estimate) throw new Error('Change order not found');
    const next: DemoEstimate = {
      ...estimate,
      changeOrders: estimate.changeOrders.map((change) => (
        change.id === id ? { ...change, status: transitionChangeOrder(change.status, status) } : change
      )),
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return presentDemoEstimate(next);
  }
  const change = await prisma.changeOrder.findFirst({ where: { id, userId } });
  if (!change) throw new Error('Change order not found');
  const current: ChangeOrderStatus = isChangeOrderStatus(change.status) ? change.status : 'draft';
  await prisma.changeOrder.update({
    where: { id },
    data: { status: transitionChangeOrder(current, status) },
  });
  const estimate = await loadEstimate(userId, change.estimateId);
  if (!estimate) throw new Error('Estimate not found');
  return estimate;
}

export async function applyChangeOrder(
  userId: string,
  id: string,
  mode: 'amend' | 'invoice',
): Promise<{ estimate: EstimateRecord; invoice?: Invoice }> {
  switch (mode) {
    case 'amend':
      return { estimate: await amendChangeOrder(userId, id) };
    case 'invoice':
      return invoiceChangeOrder(userId, id);
    default: {
      const unexpected: never = mode;
      throw new Error(`Unknown change order action ${unexpected}`);
    }
  }
}

async function findDemoChange(userId: string, id: string) {
  const estimate = fieldDemo.estimates(userId).find((item) => item.changeOrders.some((change) => change.id === id));
  const change = estimate?.changeOrders.find((item) => item.id === id) ?? null;
  return { estimate: estimate ?? null, change };
}

function assertChangeOpen(change: ChangeOrderRecord) {
  if (change.status === 'declined') throw new Error('This change order was declined');
  if (change.resolution === 'invoiced' || change.status === 'invoiced') {
    throw new Error('This change order is already an invoice');
  }
  if (change.resolution === 'amended') {
    throw new Error('This change order was added to the estimate. Convert the estimate instead of invoicing it twice.');
  }
}

async function amendChangeOrder(userId: string, id: string): Promise<EstimateRecord> {
  if (isDemoMode()) {
    const found = await findDemoChange(userId, id);
    if (!found.estimate || !found.change) throw new Error('Change order not found');
    if (found.estimate.status === 'converted') {
      throw new Error('This estimate is already an invoice. Invoice the change order instead of amending it.');
    }
    if (found.estimate.status !== 'approved') throw new Error('Approve the estimate before amending it');
    assertChangeOpen(found.change);
    const items = [...found.estimate.items, ...found.change.items.map((item) => normalizeLine(item, nanoid(10)))];
    const totals = summarize(items, found.estimate.taxRate);
    const next: DemoEstimate = {
      ...found.estimate,
      items,
      ...totals,
      changeOrders: found.estimate.changeOrders.map((change) => (
        change.id === id ? { ...change, status: 'approved' as const, resolution: 'amended' as const } : change
      )),
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return presentDemoEstimate(next);
  }

  const change = await prisma.changeOrder.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { sortOrder: 'asc' } }, estimate: true },
  });
  if (!change) throw new Error('Change order not found');
  const estimateStatus: EstimateStatus = isEstimateStatus(change.estimate.status) ? change.estimate.status : 'draft';
  if (estimateStatus === 'converted' || change.estimate.convertedInvoiceId) {
    throw new Error('This estimate is already an invoice. Invoice the change order instead of amending it.');
  }
  if (estimateStatus !== 'approved') throw new Error('Approve the estimate before amending it');
  const mapped = mapChange({ ...change, items: change.items });
  assertChangeOpen(mapped);
  const added = change.items.map((item) => normalizeLine({
    kind: asLineKind(item.kind),
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    shoppingUrl: item.shoppingUrl,
  }, nanoid(10)));
  const existing = await prisma.estimateItem.findMany({ where: { estimateId: change.estimateId } });
  const totals = summarize(
    [...existing.map((item) => ({ total: item.total })), ...added.map((item) => ({ total: item.total }))],
    change.estimate.taxRate,
  );
  await prisma.$transaction([
    prisma.estimateItem.createMany({
      data: added.map((item, index) => ({
        estimateId: change.estimateId,
        kind: item.kind,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.total,
        shoppingUrl: item.shoppingUrl,
        sortOrder: existing.length + index,
      })),
    }),
    prisma.estimate.update({
      where: { id: change.estimateId },
      data: totals,
    }),
    prisma.changeOrder.update({
      where: { id },
      data: { status: 'approved', resolution: 'amended' },
    }),
  ]);
  const updated = await loadEstimate(userId, change.estimateId);
  if (!updated) throw new Error('Estimate not found');
  return updated;
}

async function invoiceChangeOrder(userId: string, id: string): Promise<{ estimate: EstimateRecord; invoice: Invoice }> {
  if (isDemoMode()) {
    const found = await findDemoChange(userId, id);
    if (!found.estimate || !found.change) throw new Error('Change order not found');
    assertChangeOpen(found.change);
    transitionChangeOrder(found.change.status, 'invoiced');
    const estimate = presentDemoEstimate(found.estimate);
    const { invoice } = await createInvoice(userId, {
      ...invoiceInput(
        estimate,
        changeOrderInvoiceNotes(found.change.number, found.change.title, found.change.reason),
        found.change.items,
      ),
    });
    rememberDemoInvoice(userId, estimate, invoice);
    const next: DemoEstimate = {
      ...found.estimate,
      changeOrders: found.estimate.changeOrders.map((change) => (
        change.id === id ? { ...change, status: 'invoiced' as const, resolution: 'invoiced' as const, invoiceId: invoice.id } : change
      )),
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return { estimate: presentDemoEstimate(next), invoice };
  }

  const change = await prisma.changeOrder.findFirst({
    where: { id, userId },
    include: { items: true, estimate: { include: { client: true, job: true, user: { select: { company: true, name: true, email: true } } } } },
  });
  if (!change) throw new Error('Change order not found');
  const current: ChangeOrderStatus = isChangeOrderStatus(change.status) ? change.status : 'draft';
  if (change.resolution === 'amended') {
    throw new Error('This change order was added to the estimate. Convert the estimate instead of invoicing it twice.');
  }
  if (change.resolution === 'invoiced' || change.invoiceId || current === 'declined' || current === 'invoiced') {
    throw new Error(current === 'declined' ? 'This change order was declined' : 'This change order is already an invoice');
  }
  transitionChangeOrder(current, 'invoiced');
  const items = change.items.map((item) => normalizeLine({
    kind: asLineKind(item.kind),
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    shoppingUrl: item.shoppingUrl,
  }, item.id));
  const estimate: EstimateRecord = {
    id: change.estimate.id,
    estimateNumber: change.estimate.estimateNumber,
    status: isEstimateStatus(change.estimate.status) ? change.estimate.status : 'draft',
    currency: change.estimate.currency,
    taxRate: change.estimate.taxRate,
    subtotal: change.estimate.subtotal,
    tax: change.estimate.tax,
    total: change.estimate.total,
    scope: change.estimate.scope,
    notes: change.estimate.notes,
    assumptions: asStringArray(change.estimate.assumptions),
    source: asSource(change.estimate.source),
    validUntil: change.estimate.validUntil?.toISOString() ?? null,
    reviewToken: change.estimate.reviewToken,
    jobId: change.estimate.jobId,
    jobTitle: change.estimate.job?.title ?? null,
    clientId: change.estimate.clientId,
    clientName: change.estimate.client.name,
    clientEmail: change.estimate.client.email,
    country: change.estimate.client.country,
    contractorName: contractorFrom(change.estimate.user),
    invoiceId: change.estimate.convertedInvoiceId,
    invoiceNumber: null,
    previewDataUrl: null,
    previewSource: null,
    items,
    phases: [],
    photos: [],
    changeOrders: [],
    createdAt: change.estimate.createdAt.toISOString(),
  };
  const { invoice } = await createInvoice(userId, {
    ...invoiceInput(estimate, changeOrderInvoiceNotes(change.number, change.title, change.reason), items),
    linkChangeOrderId: id,
  });
  const updated = await loadEstimate(userId, change.estimateId);
  if (!updated) throw new Error('Estimate not found');
  return { estimate: updated, invoice };
}

async function loadByToken(token: string): Promise<{ estimate: EstimateRecord; siteAddress: string } | null> {
  if (isDemoMode()) {
    const estimate = fieldDemo.findEstimateByToken(token);
    if (!estimate) return null;
    const job = estimate.jobId ? fieldDemo.findJob(estimate.userId, estimate.jobId) : null;
    return { estimate: presentDemoEstimate(estimate), siteAddress: job?.siteAddress ?? '' };
  }
  const row = await prisma.estimate.findUnique({ where: { reviewToken: token }, include: estimateInclude });
  if (!row) return null;
  return { estimate: mapEstimate(row), siteAddress: row.job?.siteAddress ?? '' };
}

export async function getPublicEstimate(token: string): Promise<PublicEstimate | null> {
  const loaded = await loadByToken(token);
  if (!loaded) return null;
  return toPublicEstimate(loaded.estimate, loaded.siteAddress);
}

export async function respondToReview(
  token: string,
  input: { action: 'approve' | 'decline'; reason?: string; changeOrderId?: string },
): Promise<PublicEstimate> {
  const loaded = await loadByToken(token);
  if (!loaded) throw new Error('Estimate not found');
  if (input.changeOrderId) {
    const change = loaded.estimate.changeOrders.find((item) => item.id === input.changeOrderId);
    if (!change) throw new Error('Change order not found');
    const target: ChangeOrderStatus = input.action === 'approve' ? 'approved' : 'declined';
    if (change.status !== target) transitionChangeOrder(change.status, target);
    if (isDemoMode()) {
      const stored = fieldDemo.findEstimateByToken(token);
      if (!stored) throw new Error('Estimate not found');
      fieldDemo.replaceEstimate({
        ...stored,
        changeOrders: stored.changeOrders.map((item) => (
          item.id === change.id ? { ...item, status: target } : item
        )),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await prisma.changeOrder.update({ where: { id: change.id }, data: { status: target } });
    }
  } else {
    const target: EstimateStatus = input.action === 'approve' ? 'approved' : 'declined';
    if (loaded.estimate.status !== target) transitionEstimate(loaded.estimate.status, target);
    if (isDemoMode()) {
      const stored = fieldDemo.findEstimateByToken(token);
      if (!stored) throw new Error('Estimate not found');
      fieldDemo.replaceEstimate({ ...stored, status: target, updatedAt: new Date().toISOString() });
    } else {
      await prisma.estimate.update({
        where: { id: loaded.estimate.id },
        data: {
          status: target,
          approvedAt: target === 'approved' ? new Date() : undefined,
          declinedAt: target === 'declined' ? new Date() : undefined,
          declineReason: input.reason?.trim() || undefined,
        },
      });
    }
  }
  const refreshed = await loadByToken(token);
  if (!refreshed) throw new Error('Estimate not found');
  return toPublicEstimate(refreshed.estimate, refreshed.siteAddress);
}

export async function refreshPreview(userId: string, id: string): Promise<EstimateRecord> {
  const estimate = await loadEstimate(userId, id);
  if (!estimate) throw new Error('Estimate not found');
  const preview = await buildAfterPreview({ title: estimate.jobTitle || estimate.estimateNumber, scope: estimate.scope });
  if (isDemoMode()) {
    const stored = fieldDemo.findEstimate(userId, id);
    if (!stored) throw new Error('Estimate not found');
    const next: DemoEstimate = {
      ...stored,
      previewDataUrl: preview.previewDataUrl,
      previewSource: preview.source,
      updatedAt: new Date().toISOString(),
    };
    fieldDemo.replaceEstimate(next);
    return presentDemoEstimate(next);
  }
  await prisma.estimate.update({
    where: { id },
    data: { previewDataUrl: preview.previewDataUrl, previewSource: preview.source },
  });
  const updated = await loadEstimate(userId, id);
  if (!updated) throw new Error('Estimate not found');
  return updated;
}

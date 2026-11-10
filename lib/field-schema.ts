import { z } from 'zod';
import { CHANGE_ORDER_STATUSES, ESTIMATE_STATUSES, JOB_STATUSES, LINE_KINDS } from './field-types';

const lineSchema = z.object({
  kind: z.enum(LINE_KINDS),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).default('ea'),
  unitPrice: z.number(),
  shoppingUrl: z.string().nullable().optional(),
  tier: z.enum(['', 'good', 'better', 'best']).optional(),
});

const phaseSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  durationDays: z.number().nullable().default(null),
});

const newClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  country: z.string().min(1),
  currency: z.string().length(3),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const createJobSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  siteAddress: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  scheduledAt: z.string().nullable().optional(),
  clientId: z.string().min(1).optional(),
  client: newClientSchema.optional(),
});

export const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  siteAddress: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  scheduledAt: z.string().nullable().optional(),
});

export const manualEstimateSchema = z.object({
  clientId: z.string().min(1).optional(),
  client: newClientSchema.optional(),
  jobId: z.string().min(1).optional(),
  title: z.string().optional(),
  siteAddress: z.string().optional(),
  scope: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  items: z.array(lineSchema).optional(),
  phases: z.array(phaseSchema).optional(),
});

export const photoEstimateSchema = z.object({
  notes: z.string().default(''),
  images: z.array(z.object({
    mediaType: z.string().min(1),
    dataBase64: z.string().min(1),
  })).max(4).default([]),
  clientId: z.string().min(1).optional(),
  client: newClientSchema.optional(),
  jobId: z.string().min(1).optional(),
  siteAddress: z.string().optional(),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

export const updateEstimateSchema = z.object({
  scope: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  validUntil: z.string().nullable().optional(),
  selectedTier: z.enum(['', 'good', 'better', 'best']).optional(),
  status: z.enum(ESTIMATE_STATUSES).optional(),
  declineReason: z.string().max(500).optional(),
  items: z.array(lineSchema).min(1).optional(),
  phases: z.array(phaseSchema).optional(),
}).refine((value) => value.status !== 'converted', {
  message: 'Use convert to turn an estimate into an invoice',
  path: ['status'],
});

export const changeOrderSchema = z.object({
  title: z.string().min(1),
  reason: z.string().optional(),
  items: z.array(lineSchema).min(1),
});

export const changeStatusSchema = z.object({
  status: z.enum(CHANGE_ORDER_STATUSES),
});

export const applyChangeSchema = z.object({
  mode: z.enum(['amend', 'invoice']),
});

export const reviewSchema = z.object({
  action: z.enum(['approve', 'decline']),
  reason: z.string().max(500).optional(),
  changeOrderId: z.string().min(1).optional(),
  tier: z.enum(['', 'good', 'better', 'best']).optional(),
});

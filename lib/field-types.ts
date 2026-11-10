export const ESTIMATE_STATUSES = ['draft', 'sent', 'approved', 'declined', 'converted'] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const JOB_STATUSES = ['open', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const CHANGE_ORDER_STATUSES = ['draft', 'sent', 'approved', 'declined', 'invoiced'] as const;
export type ChangeOrderStatus = (typeof CHANGE_ORDER_STATUSES)[number];

export const LINE_KINDS = ['labor', 'materials', 'other'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

/** Good / Better / Best option a line belongs to ('' = included in every option). */
export const TIERS = ['good', 'better', 'best'] as const;
export type Tier = (typeof TIERS)[number];
export type LineTier = '' | Tier;

export type ChangeResolution = '' | 'amended' | 'invoiced';
export type EstimateSource = 'manual' | 'photo' | 'demo';
export type PreviewSource = 'replicate' | 'schematic';

export interface FieldLineInput {
  kind: LineKind;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  shoppingUrl?: string | null;
  tier?: LineTier;
}

export interface FieldLine extends FieldLineInput {
  id: string;
  total: number;
  shoppingUrl: string | null;
  tier: LineTier;
}

export interface FieldPhaseInput {
  name: string;
  description: string;
  durationDays: number | null;
}

export interface FieldPhase extends FieldPhaseInput {
  id: string;
  sortOrder: number;
}

export interface ChangeOrderRecord {
  id: string;
  number: string;
  status: ChangeOrderStatus;
  title: string;
  reason: string;
  resolution: ChangeResolution;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  invoiceId: string | null;
  items: FieldLine[];
}

export interface PhotoRecord {
  id: string;
  role: string;
  dataUrl: string;
  caption: string;
}

export interface EstimateRecord {
  id: string;
  estimateNumber: string;
  status: EstimateStatus;
  currency: string;
  /** Chosen Good/Better/Best option ('' when the estimate has no options). */
  selectedTier: LineTier;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  scope: string;
  notes: string;
  assumptions: string[];
  source: EstimateSource;
  validUntil: string | null;
  reviewToken: string;
  jobId: string | null;
  jobTitle: string | null;
  clientId: string;
  clientName: string;
  clientEmail: string;
  country: string;
  contractorName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  previewDataUrl: string | null;
  previewSource: PreviewSource | null;
  items: FieldLine[];
  phases: FieldPhase[];
  photos: PhotoRecord[];
  changeOrders: ChangeOrderRecord[];
  createdAt: string;
}

export interface EstimateListItem {
  id: string;
  estimateNumber: string;
  status: EstimateStatus;
  currency: string;
  total: number;
  clientName: string;
  jobId: string | null;
  jobTitle: string | null;
  source: EstimateSource;
  updatedAt: string;
}

export interface JobEstimateSummary {
  id: string;
  estimateNumber: string;
  status: EstimateStatus;
  total: number;
  currency: string;
}

export interface JobInvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
}

export interface JobRecord {
  id: string;
  title: string;
  summary: string;
  siteAddress: string;
  status: JobStatus;
  scheduledAt: string | null;
  clientId: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  country: string;
  createdAt: string;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  photos: PhotoRecord[];
}

export interface JobListItem {
  id: string;
  title: string;
  siteAddress: string;
  status: JobStatus;
  scheduledAt: string | null;
  clientName: string;
  currency: string;
  estimateCount: number;
  openEstimateTotal: number;
  updatedAt: string;
}

export interface PublicEstimate {
  estimateNumber: string;
  status: EstimateStatus;
  currency: string;
  selectedTier: LineTier;
  tierTotals: Partial<Record<Tier, { subtotal: number; tax: number; total: number }>>;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  scope: string;
  notes: string;
  assumptions: string[];
  validUntil: string | null;
  clientName: string;
  contractorName: string;
  jobTitle: string | null;
  siteAddress: string;
  items: FieldLine[];
  phases: FieldPhase[];
  photos: PhotoRecord[];
  previewDataUrl: string | null;
  previewSource: PreviewSource | null;
  changeOrders: ChangeOrderRecord[];
}

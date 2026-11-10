import type { LineItem } from './types';
import type {
  ChangeOrderStatus,
  EstimateRecord,
  EstimateStatus,
  FieldLine,
  FieldLineInput,
  FieldPhaseInput,
  JobStatus,
  LineKind,
  PublicEstimate,
} from './field-types';
import { CHANGE_ORDER_STATUSES, ESTIMATE_STATUSES, JOB_STATUSES, LINE_KINDS } from './field-types';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isLineKind(value: string): value is LineKind {
  return (LINE_KINDS as readonly string[]).includes(value);
}

export function isEstimateStatus(value: string): value is EstimateStatus {
  return (ESTIMATE_STATUSES as readonly string[]).includes(value);
}

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}

export function isChangeOrderStatus(value: string): value is ChangeOrderStatus {
  return (CHANGE_ORDER_STATUSES as readonly string[]).includes(value);
}

export function kindLabel(kind: LineKind): string {
  switch (kind) {
    case 'labor':
      return 'Labor';
    case 'materials':
      return 'Materials';
    case 'other':
      return 'Other';
    default: {
      const unexpected: never = kind;
      return unexpected;
    }
  }
}

export function materialShoppingUrl(description: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(description)}`;
}

export function normalizeLine(input: FieldLineInput, id: string): FieldLine {
  const kind = isLineKind(input.kind) ? input.kind : 'other';
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Each line needs a quantity greater than zero');
  }
  if (!Number.isFinite(unitPrice)) {
    throw new Error('Each line needs a unit price');
  }
  const description = input.description.trim();
  if (!description) throw new Error('Each line needs a description');
  const shoppingUrl = kind === 'materials'
    ? (input.shoppingUrl?.trim() || materialShoppingUrl(description))
    : null;
  return {
    id,
    kind,
    description,
    quantity,
    unit: input.unit.trim() || 'ea',
    unitPrice: roundMoney(unitPrice),
    total: roundMoney(quantity * unitPrice),
    shoppingUrl,
  };
}

export function summarize(lines: Array<Pick<FieldLine, 'total'>>, taxRate: number) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
  const rate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0;
  const tax = roundMoney(subtotal * rate);
  return { subtotal, tax, total: roundMoney(subtotal + tax), taxRate: rate };
}

export function allowedEstimateTransitions(from: EstimateStatus): EstimateStatus[] {
  switch (from) {
    case 'draft':
      return ['sent'];
    case 'sent':
      return ['approved', 'declined', 'draft'];
    case 'approved':
      return ['converted'];
    case 'declined':
      return ['draft'];
    case 'converted':
      return [];
    default: {
      const unexpected: never = from;
      return unexpected;
    }
  }
}

export function transitionEstimate(from: EstimateStatus, to: EstimateStatus): EstimateStatus {
  if (from === to) return from;
  if (!allowedEstimateTransitions(from).includes(to)) {
    throw new Error(`Cannot move an estimate from ${from} to ${to}`);
  }
  return to;
}

export function assertCanConvert(status: EstimateStatus, alreadyConverted: boolean): void {
  if (alreadyConverted || status === 'converted') {
    throw new Error('This estimate is already an invoice');
  }
  if (status !== 'approved') {
    throw new Error('Approve the estimate before converting it to an invoice');
  }
}

export function allowedChangeTransitions(from: ChangeOrderStatus): ChangeOrderStatus[] {
  switch (from) {
    case 'draft':
      return ['sent', 'approved', 'declined', 'invoiced'];
    case 'sent':
      return ['approved', 'declined', 'invoiced'];
    case 'approved':
      return ['invoiced'];
    case 'declined':
      return [];
    case 'invoiced':
      return [];
    default: {
      const unexpected: never = from;
      return unexpected;
    }
  }
}

export function transitionChangeOrder(from: ChangeOrderStatus, to: ChangeOrderStatus): ChangeOrderStatus {
  if (from === to) return from;
  if (!allowedChangeTransitions(from).includes(to)) {
    throw new Error(`Cannot move a change order from ${from} to ${to}`);
  }
  return to;
}

export function toInvoiceItems(lines: FieldLine[]): LineItem[] {
  if (lines.length === 0) throw new Error('Add at least one line before creating an invoice');
  return lines.map((line) => ({
    description: `${kindLabel(line.kind)} — ${line.description}`,
    quantity: line.quantity,
    unitRate: line.unitPrice,
  }));
}

export function defaultDueDate(from = new Date()): string {
  const due = new Date(from.getTime());
  due.setUTCDate(due.getUTCDate() + 14);
  return due.toISOString().slice(0, 10);
}

export function defaultValidUntil(from = new Date()): string {
  const valid = new Date(from.getTime());
  valid.setUTCDate(valid.getUTCDate() + 30);
  return valid.toISOString().slice(0, 10);
}

export function estimateInvoiceNotes(estimate: Pick<EstimateRecord, 'estimateNumber' | 'scope' | 'notes' | 'assumptions'>): string {
  const assumptions = estimate.assumptions.length
    ? `Assumptions:\n- ${estimate.assumptions.join('\n- ')}`
    : '';
  return [`From estimate ${estimate.estimateNumber}`, estimate.scope, estimate.notes, assumptions]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function changeOrderInvoiceNotes(number: string, title: string, reason: string): string {
  return [`Change order ${number}: ${title}`, reason].map((part) => part.trim()).filter(Boolean).join('\n\n');
}

export function normalizePhases(phases: FieldPhaseInput[]) {
  return phases
    .map((phase, index) => ({
      name: phase.name.trim(),
      description: phase.description.trim(),
      durationDays: phase.durationDays && phase.durationDays > 0 ? Math.round(phase.durationDays) : null,
      sortOrder: index,
    }))
    .filter((phase) => phase.name);
}

export function toPublicEstimate(estimate: EstimateRecord, siteAddress: string): PublicEstimate {
  return {
    estimateNumber: estimate.estimateNumber,
    status: estimate.status,
    currency: estimate.currency,
    taxRate: estimate.taxRate,
    subtotal: estimate.subtotal,
    tax: estimate.tax,
    total: estimate.total,
    scope: estimate.scope,
    notes: estimate.notes,
    assumptions: estimate.assumptions,
    validUntil: estimate.validUntil,
    clientName: estimate.clientName,
    contractorName: estimate.contractorName,
    jobTitle: estimate.jobTitle,
    siteAddress,
    items: estimate.items,
    phases: estimate.phases,
    photos: estimate.photos.filter((photo) => photo.role === 'site'),
    previewDataUrl: estimate.previewDataUrl,
    previewSource: estimate.previewSource,
    changeOrders: estimate.changeOrders,
  };
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'change_order':
      return 'Change order';
    default:
      return status.replace(/_/g, ' ');
  }
}

import { SAMPLE_CLIENTS } from './constants';
import { buildDemoPhotoEstimate } from './photo-estimate';
import type {
  ChangeOrderRecord,
  EstimateRecord,
  JobInvoiceSummary,
  JobRecord,
  PhotoRecord,
} from './field-types';

export interface DemoClient {
  id: string;
  userId: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  phone: string;
  address: string;
}

interface DemoJob {
  id: string;
  userId: string;
  clientId: string;
  title: string;
  summary: string;
  siteAddress: string;
  status: JobRecord['status'];
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoEstimate extends EstimateRecord {
  userId: string;
  updatedAt: string;
}

interface DemoState {
  clients: DemoClient[];
  jobs: DemoJob[];
  estimates: DemoEstimate[];
  invoices: Array<JobInvoiceSummary & { jobId: string | null; userId: string }>;
}

const DEMO_USER = 'demo-user';
const CONTRACTOR = 'Harbor & Pine Contracting';

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function lineId(prefix: string, index: number): string {
  return `${prefix}-line-${index + 1}`;
}

function seedEstimate(
  id: string,
  number: string,
  token: string,
  job: DemoJob,
  client: DemoClient,
  notes: string,
  status: EstimateRecord['status'],
): DemoEstimate {
  const draft = buildDemoPhotoEstimate({ notes, photoCount: 0 });
  const items = draft.items.map((item, index) => {
    const total = Math.round(item.quantity * item.unitPrice * 100) / 100;
    return { ...item, id: lineId(id, index), total, shoppingUrl: item.shoppingUrl ?? null };
  });
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  return {
    id,
    userId: DEMO_USER,
    estimateNumber: number,
    status,
    currency: client.currency,
    taxRate: 0,
    subtotal,
    tax: 0,
    total: subtotal,
    scope: draft.scope,
    notes,
    assumptions: draft.assumptions,
    source: 'demo',
    validUntil: isoDaysFromNow(30),
    reviewToken: token,
    jobId: job.id,
    jobTitle: job.title,
    clientId: client.id,
    clientName: client.name,
    clientEmail: client.email,
    country: client.country,
    contractorName: CONTRACTOR,
    invoiceId: null,
    invoiceNumber: null,
    previewDataUrl: null,
    previewSource: null,
    selectedTier: '' as const,
    items: items.map((item) => ({ ...item, tier: item.tier ?? ('' as const) })),
    phases: draft.phases.map((phase, index) => ({ ...phase, id: `${id}-phase-${index + 1}`, sortOrder: index })),
    photos: [] as PhotoRecord[],
    changeOrders: [] as ChangeOrderRecord[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function seed(): DemoState {
  const clients: DemoClient[] = SAMPLE_CLIENTS.map((client) => ({
    id: String(client.id),
    userId: DEMO_USER,
    name: client.name,
    email: client.email,
    country: client.country,
    currency: client.currency,
    phone: '',
    address: '',
  }));
  const acme = clients[0];
  const tech = clients[1];
  const now = new Date().toISOString();
  const fence: DemoJob = {
    id: 'job_fence',
    userId: DEMO_USER,
    clientId: acme.id,
    title: 'Backyard privacy fence',
    summary: 'Replace the leaning side-yard fence and add a walk gate.',
    siteAddress: '14 Cedar Lane, Portland, OR',
    status: 'in_progress',
    scheduledAt: isoDaysFromNow(2),
    createdAt: now,
    updatedAt: now,
  };
  const paint: DemoJob = {
    id: 'job_paint',
    userId: DEMO_USER,
    clientId: tech.id,
    title: 'Office hallway repaint',
    summary: 'Two coats on the hallway and the reception wall.',
    siteAddress: '88 Market Street, Austin, TX',
    status: 'scheduled',
    scheduledAt: isoDaysFromNow(5),
    createdAt: now,
    updatedAt: now,
  };
  const year = new Date().getUTCFullYear();
  return {
    clients,
    jobs: [fence, paint],
    estimates: [
      seedEstimate('est_fence', `EST-${year}-0001`, 'demo-est-fence', fence, acme, '80 foot cedar privacy fence with a walk gate on the left', 'sent'),
      seedEstimate('est_paint', `EST-${year}-0002`, 'demo-est-paint', paint, tech, 'Repaint 2 rooms, hallway and reception, two coats', 'approved'),
    ],
    invoices: [],
  };
}

function bucket(): DemoState {
  const holder = globalThis as { __invoiceosField?: DemoState };
  if (!holder.__invoiceosField) holder.__invoiceosField = seed();
  return holder.__invoiceosField;
}

export function resetFieldDemo(): void {
  (globalThis as { __invoiceosField?: DemoState }).__invoiceosField = seed();
}

export function demoContractorName(): string {
  return CONTRACTOR;
}

export const fieldDemo = {
  clients(userId: string) {
    return bucket().clients.filter((client) => client.userId === userId);
  },
  findClient(userId: string, id: string) {
    return bucket().clients.find((client) => client.userId === userId && client.id === id) ?? null;
  },
  findClientByEmail(userId: string, email: string) {
    return bucket().clients.find((client) => client.userId === userId && client.email.toLowerCase() === email.toLowerCase()) ?? null;
  },
  insertClient(client: DemoClient) {
    bucket().clients.unshift(client);
    return client;
  },
  jobs(userId: string) {
    return bucket().jobs.filter((job) => job.userId === userId);
  },
  findJob(userId: string, id: string) {
    return bucket().jobs.find((job) => job.userId === userId && job.id === id) ?? null;
  },
  insertJob(job: DemoJob) {
    bucket().jobs.unshift(job);
    return job;
  },
  replaceJob(job: DemoJob) {
    const jobs = bucket().jobs;
    const index = jobs.findIndex((item) => item.id === job.id);
    if (index >= 0) jobs[index] = job;
  },
  estimates(userId: string) {
    return bucket().estimates.filter((estimate) => estimate.userId === userId);
  },
  allEstimates() {
    return bucket().estimates;
  },
  findEstimate(userId: string, id: string) {
    return bucket().estimates.find((estimate) => estimate.userId === userId && estimate.id === id) ?? null;
  },
  findEstimateByToken(token: string) {
    return bucket().estimates.find((estimate) => estimate.reviewToken === token) ?? null;
  },
  insertEstimate(estimate: DemoEstimate) {
    bucket().estimates.unshift(estimate);
    return estimate;
  },
  replaceEstimate(estimate: DemoEstimate) {
    const estimates = bucket().estimates;
    const index = estimates.findIndex((item) => item.id === estimate.id);
    if (index >= 0) estimates[index] = estimate;
  },
  rememberInvoice(userId: string, jobId: string | null, invoice: JobInvoiceSummary) {
    bucket().invoices.unshift({ ...invoice, jobId, userId });
  },
  invoicesFor(userId: string, jobId: string) {
    return bucket().invoices.filter((invoice) => invoice.userId === userId && invoice.jobId === jobId);
  },
};

export type { DemoEstimate, DemoJob };

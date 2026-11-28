/** Invoice Jot on-device data model. Everything lives on the phone; there is no account. */

export type DocKind = 'invoice' | 'estimate';
export type DocStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'paid';
export type DiscountType = 'percent' | 'amount';
export type PdfStyle = 'classic' | 'modern' | 'bold' | 'formal' | 'minimal' | 'banded' | 'ledger' | 'compact';

export interface Business {
  name: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  taxId: string;
  /** Data URL of a small logo (PNG/JPEG), or '' for none. */
  logo: string;
  /** Default link clients can use to pay (the user's own Stripe Payment Link, PayPal.me, Square, etc.). */
  paymentLink: string;
  paymentInstructions: string;
  currency: string;
  defaultTaxRate: number;
  defaultTermsDays: number;
  defaultNotes: string;
  pdfStyle: PdfStyle;
  accent: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  taxable: boolean;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
}

export interface Doc {
  id: string;
  kind: DocKind;
  number: string;
  status: DocStatus;
  title: string;
  clientId: string | null;
  /** Snapshot so the document still reads right if the client is later edited or deleted. */
  clientSnapshot: Pick<Client, 'name' | 'email' | 'phone' | 'address'> | null;
  issueDate: string;
  dueDate: string;
  lines: LineItem[];
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
  deposit: number;
  payments: Payment[];
  notes: string;
  terms: string;
  paymentLink: string;
  /** Estimate this invoice was converted from (or invoice an estimate became). */
  linkedDocId: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  note: string;
  /** Compressed JPEG data URL, or '' when no photo was attached. */
  photo: string;
  docId: string | null;
  createdAt: string;
}

export interface Database {
  app: 'InvoiceJot';
  version: 1;
  updatedAt: string;
  business: Business;
  clients: Client[];
  items: SavedItem[];
  docs: Doc[];
  receipts: Receipt[];
  counters: { invoice: number; estimate: number };
  /** Invoice ids that have been sent or exported at least once (drives the free-plan limit). */
  sentInvoiceIds: string[];
  /** Invoices marked paid, used to time the App Store review prompt. */
  paidCount: number;
  onboarded: boolean;
}

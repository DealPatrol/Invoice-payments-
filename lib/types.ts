export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'paid' | 'overdue';

export interface LineItem {
  description: string;
  quantity: number;
  unitRate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  country: string;
  currency: string;
  network: string;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
  paidDate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  items: LineItem[];
  payToken: string;
  stripeSessionId?: string;
  recurring?: boolean;
  lateFeePercent?: number;
  payScore?: number;
}

export interface DashboardStats {
  totalRevenue: number;
  collected: number;
  outstandingCount: number;
  overdueCount: number;
  collectionRate: number;
  avgPayScore: number;
}

export interface ReportsData {
  revenue: number;
  totalBilled: number;
  outstanding: number;
  collectionRate: number;
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days60plus: number;
  };
}

export interface CreateInvoiceInput {
  clientName: string;
  clientEmail: string;
  country: string;
  currency: string;
  network?: string;
  dueDate: string;
  notes?: string;
  taxRate: number;
  items: LineItem[];
  recurring?: boolean;
  lateFeePercent?: number;
}

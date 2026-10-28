// Color System
// Design tokens (CSS variables in app/globals.css) so every screen follows light/dark mode.
export const COLORS = {
  background: 'var(--background)',
  surface: 'var(--surface)',
  surfaceHigh: 'var(--surface-high)',
  text: 'var(--text)',
  textMuted: 'var(--text-muted)',
  border: 'var(--border)',
  accent: 'var(--accent)',
  accentGlow: 'var(--accent-soft)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
};

export const NETWORKS = [
  {
    id: 'PEPPOL',
    name: 'PEPPOL',
    description: 'Pan-European Public Procurement Online',
    status: 'live' as const,
    countries: 40,
    icon: '🌍',
  },
  {
    id: 'ZUGFeRD',
    name: 'ZUGFeRD',
    description: 'German E-Invoice Standard',
    status: 'live' as const,
    countries: 1,
    icon: '🇩🇪',
  },
  {
    id: 'NF-e',
    name: 'NF-e',
    description: 'Brazilian Electronic Invoice',
    status: 'live' as const,
    countries: 1,
    icon: '🇧🇷',
  },
  {
    id: 'JP e-Invoice',
    name: 'JP e-Invoice',
    description: 'Japanese E-Invoice Standard',
    status: 'beta' as const,
    countries: 1,
    icon: '🇯🇵',
  },
  {
    id: 'AU RCTI',
    name: 'AU RCTI',
    description: 'Australian Recipient Created Tax Invoice',
    status: 'beta' as const,
    countries: 1,
    icon: '🇦🇺',
  },
];

export const COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden', 'United Kingdom', 'United States', 'Canada', 'Brazil',
  'Japan', 'Australia', 'Mexico', 'Singapore', 'India', 'China',
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN'];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  CNY: '¥',
  INR: '₹',
  MXN: '$',
};

export const TAX_RATES = [0, 5, 7, 10, 15, 19, 20, 23];

export const SAMPLE_INVOICES = [
  {
    id: 'INV-2024-001',
    clientName: 'Acme Corp',
    amount: 2500,
    currency: 'USD',
    status: 'paid' as const,
    dueDate: new Date('2024-05-30'),
    issuedDate: new Date('2024-05-01'),
    network: 'PEPPOL',
  },
  {
    id: 'INV-2024-002',
    clientName: 'Tech Innovations LLC',
    amount: 5000,
    currency: 'EUR',
    status: 'pending' as const,
    dueDate: new Date('2024-06-15'),
    issuedDate: new Date('2024-05-15'),
    network: 'PEPPOL',
  },
  {
    id: 'INV-2024-003',
    clientName: 'Global Solutions GmbH',
    amount: 3750,
    currency: 'EUR',
    status: 'overdue' as const,
    dueDate: new Date('2024-05-01'),
    issuedDate: new Date('2024-04-01'),
    network: 'ZUGFeRD',
  },
  {
    id: 'INV-2024-004',
    clientName: 'Japanese Partners Co',
    amount: 4200,
    currency: 'JPY',
    status: 'draft' as const,
    dueDate: new Date('2024-06-30'),
    issuedDate: new Date('2024-05-27'),
    network: 'JP e-Invoice',
  },
];

export const SAMPLE_CLIENTS = [
  {
    id: 1,
    name: 'Acme Corp',
    email: 'invoice@acmecorp.com',
    country: 'United States',
    currency: 'USD',
    totalBilled: 12500,
    totalPaid: 12500,
  },
  {
    id: 2,
    name: 'Tech Innovations LLC',
    email: 'billing@techinnovate.com',
    country: 'United Kingdom',
    currency: 'GBP',
    totalBilled: 8750,
    totalPaid: 5000,
  },
  {
    id: 3,
    name: 'Global Solutions GmbH',
    email: 'kontakt@globallösungen.de',
    country: 'Germany',
    currency: 'EUR',
    totalBilled: 15000,
    totalPaid: 10000,
  },
  {
    id: 4,
    name: 'Japanese Partners Co',
    email: 'info@japanpartners.jp',
    country: 'Japan',
    currency: 'JPY',
    totalBilled: 2500000,
    totalPaid: 1250000,
  },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'var(--surface-high)', text: 'var(--text-muted)', border: 'var(--border-strong)' },
  sent: { bg: 'var(--accent-soft)', text: 'var(--accent)', border: 'var(--accent)' },
  pending: { bg: 'var(--warning-soft)', text: 'var(--warning)', border: 'var(--warning)' },
  paid: { bg: 'var(--success-soft)', text: 'var(--success)', border: 'var(--success)' },
  overdue: { bg: 'var(--danger-soft)', text: 'var(--danger)', border: 'var(--danger)' },
};

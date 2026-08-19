// Invoice Export Utilities
import { CURRENCY_SYMBOLS } from './constants';

export interface InvoiceData {
  id: string;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitRate: number;
  }>;
  status: string;
  notes?: string;
  companyName?: string;
  companyEmail?: string;
}

export function generateInvoiceHTML(invoice: InvoiceData): string {
  const items = invoice.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${CURRENCY_SYMBOLS[invoice.currency] || '$'}${item.unitRate.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${CURRENCY_SYMBOLS[invoice.currency] || '$'}${(item.quantity * item.unitRate).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 30px;
    }
    .company-info h1 {
      margin: 0;
      font-size: 28px;
      color: #1f2937;
    }
    .company-info p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .invoice-details {
      text-align: right;
    }
    .invoice-details h2 {
      margin: 0 0 15px 0;
      font-size: 32px;
      color: #3b82f6;
    }
    .invoice-details p {
      margin: 5px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .invoice-details strong {
      color: #1f2937;
    }
    .parties {
      display: flex;
      gap: 60px;
      margin-bottom: 40px;
    }
    .party {
      flex: 1;
    }
    .party h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
    }
    .party p {
      margin: 5px 0;
      font-size: 14px;
      color: #1f2937;
    }
    .items-section {
      margin-bottom: 40px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      text-align: left;
      padding: 12px;
      background: #f3f4f6;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #4b5563;
      border: 1px solid #e5e7eb;
    }
    .totals {
      float: right;
      width: 300px;
      margin-top: 20px;
      border-top: 2px solid #e5e7eb;
      padding-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .total-row.total {
      font-size: 18px;
      font-weight: 700;
      color: #3b82f6;
      border-top: 2px solid #3b82f6;
      padding-top: 10px;
    }
    .notes {
      clear: both;
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .notes h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
    }
    .notes p {
      margin: 0;
      font-size: 14px;
      color: #1f2937;
      line-height: 1.6;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <h1>${invoice.companyName || 'Company Name'}</h1>
        <p>${invoice.companyEmail || 'company@example.com'}</p>
      </div>
      <div class="invoice-details">
        <h2>INVOICE</h2>
        <p><strong>#${invoice.invoiceNumber}</strong></p>
        <p><strong>${new Date(invoice.issueDate).toLocaleDateString()}</strong></p>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>From</h3>
        <p>${invoice.companyName || 'Your Company'}</p>
        <p>${invoice.companyEmail || 'company@example.com'}</p>
      </div>
      <div class="party">
        <h3>Bill To</h3>
        <p>${invoice.clientName}</p>
        <p>${invoice.clientEmail}</p>
      </div>
      <div class="party">
        <h3>Due Date</h3>
        <p>${new Date(invoice.dueDate).toLocaleDateString()}</p>
        <p style="color: ${invoice.status === 'overdue' ? '#991b1b' : '#059669'}; font-weight: 600;">
          ${invoice.status.toUpperCase()}
        </p>
      </div>
    </div>

    <div class="items-section">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right; width: 80px;">Qty</th>
            <th style="text-align: right; width: 100px;">Unit Rate</th>
            <th style="text-align: right; width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${CURRENCY_SYMBOLS[invoice.currency] || '$'}${(invoice.amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Tax</span>
          <span>${CURRENCY_SYMBOLS[invoice.currency] || '$'}${invoice.tax.toFixed(2)}</span>
        </div>
        <div class="total-row total">
          <span>Total</span>
          <span>${CURRENCY_SYMBOLS[invoice.currency] || '$'}${invoice.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    ${
      invoice.notes
        ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${invoice.notes}</p>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString()} | Thank you for your business</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function downloadPDF(invoiceData: InvoiceData) {
  const html = generateInvoiceHTML(invoiceData);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoiceData.invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAsCSV(invoiceData: InvoiceData) {
  const rows = [
    ['Invoice Number', invoiceData.invoiceNumber],
    ['Client', invoiceData.clientName],
    ['Amount', invoiceData.amount],
    ['Tax', invoiceData.tax],
    ['Total', invoiceData.total],
    ['Status', invoiceData.status],
    ['Issue Date', invoiceData.issueDate],
    ['Due Date', invoiceData.dueDate],
    [],
    ['Description', 'Quantity', 'Unit Rate', 'Amount'],
    ...invoiceData.items.map((item) => [
      item.description,
      item.quantity,
      item.unitRate,
      item.quantity * item.unitRate,
    ]),
  ];

  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoiceData.invoiceNumber}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { jsPDF } from 'jspdf';
import type { Business, Doc } from './types';
import { docTotals, lineTotal } from './calc';
import { formatDate, formatMoney } from './util';

/** Standard PDF fonts are WinAnsi; map anything else to safe equivalents. */
export function pdfSafe(s: string): string {
  return (s || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u202F\u2009]/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF\u20AC]/g, '');
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [31, 111, 92];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface PdfInput {
  doc: Doc;
  business: Business;
  /** Free-plan footer text, or null on Pro. */
  footer: string | null;
}

export function pdfFileName(doc: Doc): string {
  const who = (doc.clientSnapshot?.name || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `${doc.kind === 'invoice' ? 'Invoice' : 'Estimate'}-${doc.number}${who ? '-' + who : ''}.pdf`;
}

export function buildDocPdf({ doc, business, footer }: PdfInput): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 48;
  const accent = hexToRgb(business.accent);
  const INK: [number, number, number] = [26, 28, 32];
  const MUTED: [number, number, number] = [100, 104, 112];
  const RULE: [number, number, number] = [224, 222, 216];
  const cur = business.currency || 'USD';
  const money = (n: number) => pdfSafe(formatMoney(n, cur));
  const t = docTotals(doc);
  const title = doc.kind === 'invoice' ? 'INVOICE' : 'ESTIMATE';
  const style = business.pdfStyle;
  const text = (s: string, x: number, y: number, o?: Parameters<jsPDF['text']>[3]) => pdf.text(pdfSafe(s), x, y, o);
  let y = M;

  const newPageIfNeeded = (need: number) => {
    if (y + need > H - M - 30) {
      pdf.addPage();
      y = M;
    }
  };

  // Header
  if (style === 'bold') {
    pdf.setFillColor(...accent);
    pdf.rect(0, 0, W, 110, 'F');
  } else if (style === 'modern') {
    pdf.setFillColor(...accent);
    pdf.rect(0, 0, W, 8, 'F');
  }
  const headInk: [number, number, number] = style === 'bold' ? [255, 255, 255] : INK;
  let logoW = 0;
  if (business.logo) {
    try {
      const fmt = business.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const props = pdf.getImageProperties(business.logo);
      const h = 54;
      logoW = Math.min(140, (props.width / props.height) * h);
      pdf.addImage(business.logo, fmt, M, 30, logoW, h);
      logoW += 14;
    } catch {
      logoW = 0;
    }
  }
  pdf.setTextColor(...headInk);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  text(business.name || 'Your Business', M + logoW, 48);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const bizLines = [business.address, [business.phone, business.email].filter(Boolean).join('  ·  '), business.website, business.taxId ? `Tax ID: ${business.taxId}` : ''].filter(Boolean);
  let by = 62;
  for (const l of bizLines) {
    for (const part of pdf.splitTextToSize(pdfSafe(l), 260)) {
      pdf.text(part, M + logoW, by);
      by += 11;
    }
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  if (style !== 'bold') pdf.setTextColor(...accent);
  text(title, W - M, 50, { align: 'right' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...headInk);
  text(doc.number, W - M, 66, { align: 'right' });
  y = Math.max(by, style === 'bold' ? 128 : 100) + 14;

  // Bill to + dates
  pdf.setTextColor(...MUTED);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  text(doc.kind === 'invoice' ? 'BILL TO' : 'PREPARED FOR', M, y);
  text('DETAILS', W / 2 + 40, y);
  y += 14;
  pdf.setTextColor(...INK);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  text(doc.clientSnapshot?.name || 'Client', M, y);
  pdf.setFont('helvetica', 'normal');
  let cy = y + 13;
  for (const l of [doc.clientSnapshot?.address, doc.clientSnapshot?.email, doc.clientSnapshot?.phone].filter(Boolean) as string[]) {
    for (const part of pdf.splitTextToSize(pdfSafe(l), 220)) {
      pdf.text(part, M, cy);
      cy += 12;
    }
  }
  const details: [string, string][] = [
    ['Date', formatDate(doc.issueDate)],
    [doc.kind === 'invoice' ? 'Due' : 'Valid until', formatDate(doc.dueDate)],
  ];
  if (doc.title) details.unshift(['Project', doc.title]);
  let dy = y;
  for (const [k, v] of details) {
    pdf.setTextColor(...MUTED);
    text(k, W / 2 + 40, dy);
    pdf.setTextColor(...INK);
    text(v, W - M, dy, { align: 'right' });
    dy += 13;
  }
  y = Math.max(cy, dy) + 16;

  // Line items table
  const colQty = W - M - 190;
  const colRate = W - M - 100;
  const colAmt = W - M;
  const header = () => {
    if (style === 'classic') {
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(1);
      pdf.line(M, y + 6, W - M, y + 6);
    } else {
      pdf.setFillColor(style === 'bold' ? accent[0] : 244, style === 'bold' ? accent[1] : 243, style === 'bold' ? accent[2] : 239);
      pdf.rect(M, y - 10, W - 2 * M, 22, 'F');
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...(style === 'bold' ? ([255, 255, 255] as [number, number, number]) : INK));
    text('Description', M + 8, y + 4);
    text('Qty', colQty, y + 4, { align: 'right' });
    text('Rate', colRate, y + 4, { align: 'right' });
    text('Amount', colAmt - 8, y + 4, { align: 'right' });
    y += 26;
  };
  header();
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...INK);
  for (const l of doc.lines) {
    const nameLines = pdf.splitTextToSize(pdfSafe(l.name || 'Item'), colQty - M - 60) as string[];
    const descLines = l.description ? (pdf.splitTextToSize(pdfSafe(l.description), colQty - M - 60) as string[]) : [];
    const need = 12 * (nameLines.length + descLines.length) + 10;
    if (y + need > H - M - 30) {
      pdf.addPage();
      y = M;
      header();
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    nameLines.forEach((s, i) => pdf.text(s, M + 8, y + i * 12));
    pdf.setFont('helvetica', 'normal');
    text(String(l.quantity), colQty, y, { align: 'right' });
    text(money(l.unitPrice), colRate, y, { align: 'right' });
    text(money(lineTotal(l)), colAmt - 8, y, { align: 'right' });
    let ly = y + nameLines.length * 12;
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    for (const s of descLines) {
      pdf.text(s, M + 8, ly);
      ly += 11;
    }
    y = ly + 6;
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.5);
    pdf.line(M, y - 2, W - M, y - 2);
    y += 10;
  }

  // Totals
  newPageIfNeeded(140);
  const tx = W - M - 200;
  const rows: [string, string, boolean?][] = [['Subtotal', money(t.subtotal)]];
  if (t.discount > 0) rows.push([doc.discountType === 'percent' ? `Discount (${doc.discountValue}%)` : 'Discount', `-${money(t.discount)}`]);
  if (t.tax > 0 || doc.taxRate > 0) rows.push([`Tax (${doc.taxRate}%)`, money(t.tax)]);
  rows.push(['Total', money(t.total), true]);
  if (t.paid > 0) rows.push(['Paid', `-${money(t.paid)}`]);
  if (doc.kind === 'invoice') rows.push(['Balance due', money(t.balance), true]);
  if (t.deposit > 0 && t.paid < t.deposit) rows.push([doc.kind === 'estimate' ? 'Deposit to start' : 'Deposit due', money(t.deposit)]);
  for (const [k, v, strong] of rows) {
    pdf.setFont('helvetica', strong ? 'bold' : 'normal');
    pdf.setFontSize(strong ? 12 : 10);
    pdf.setTextColor(...(strong ? INK : MUTED));
    text(k, tx, y);
    pdf.setTextColor(...INK);
    text(v, W - M - 8, y, { align: 'right' });
    y += strong ? 18 : 15;
  }
  y += 10;

  // Payment link, instructions, notes, terms
  const link = doc.paymentLink || business.paymentLink;
  const blocks: [string, string][] = [];
  if (doc.kind === 'invoice' && link) blocks.push(['Pay online', link]);
  if (doc.kind === 'invoice' && business.paymentInstructions) blocks.push(['How to pay', business.paymentInstructions]);
  if (doc.notes) blocks.push(['Notes', doc.notes]);
  if (doc.terms) blocks.push(['Terms', doc.terms]);
  for (const [k, v] of blocks) {
    const lines = pdf.splitTextToSize(pdfSafe(v), W - 2 * M) as string[];
    newPageIfNeeded(16 + lines.length * 12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    text(k.toUpperCase(), M, y);
    y += 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...(k === 'Pay online' ? accent : INK));
    lines.forEach((s) => {
      pdf.text(s, M, y);
      y += 12;
    });
    if (k === 'Pay online') pdf.link(M, y - 12 * lines.length - 10, W - 2 * M, 12 * lines.length, { url: v });
    y += 8;
  }

  if (footer) {
    const pages = pdf.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      text(footer, W / 2, H - 24, { align: 'center' });
      pdf.link(W / 2 - 90, H - 34, 180, 14, { url: 'https://invoicejot.com' });
    }
  }
  pdf.setProperties({ title: pdfSafe(`${title} ${doc.number}`), creator: 'Invoice Jot', author: pdfSafe(business.name) });
  return pdf;
}

export function docPdfBlob(input: PdfInput): Blob {
  return buildDocPdf(input).output('blob');
}

export function docPdfBase64(input: PdfInput): string {
  const uri = buildDocPdf(input).output('datauristring');
  return uri.slice(uri.indexOf(',') + 1);
}

import type { PdfStyle } from './types';

export interface PdfStyleInfo {
  id: PdfStyle;
  label: string;
  blurb: string;
  /** Pro-only styles. The three original looks stay free. */
  pro: boolean;
}

/** Modern, Classic and Bold shipped in v1 and stay free. */
export const FREE_PDF_STYLES: readonly PdfStyle[] = ['modern', 'classic', 'bold'];

/** Extra looks unlocked with Invoice Jot Pro. */
export const PRO_PDF_STYLES: readonly PdfStyle[] = ['formal', 'minimal', 'banded', 'ledger', 'compact'];

export const PDF_STYLES: readonly PdfStyleInfo[] = [
  { id: 'modern', label: 'Modern', blurb: 'Accent bar and a clean layout', pro: false },
  { id: 'classic', label: 'Classic', blurb: 'Simple rules, traditional invoice', pro: false },
  { id: 'bold', label: 'Bold', blurb: 'Full-color header band', pro: false },
  { id: 'formal', label: 'Formal', blurb: 'Times type, double rules — a letterhead look', pro: true },
  { id: 'minimal', label: 'Minimal', blurb: 'Airy, thin lines, lots of white space', pro: true },
  { id: 'banded', label: 'Banded', blurb: 'Color bar down the left edge', pro: true },
  { id: 'ledger', label: 'Ledger', blurb: 'Full grid table, lined-paper feel', pro: true },
  { id: 'compact', label: 'Compact', blurb: 'Tighter type so more items fit on a page', pro: true },
];

export const ALL_PDF_STYLES: readonly PdfStyle[] = PDF_STYLES.map((s) => s.id);

export function isPdfStyle(v: unknown): v is PdfStyle {
  return typeof v === 'string' && (ALL_PDF_STYLES as readonly string[]).includes(v);
}

export function isProPdfStyle(style: PdfStyle): boolean {
  return (PRO_PDF_STYLES as readonly string[]).includes(style);
}

/**
 * Style actually used when building a PDF.
 * Free users (and unknown values) always get a free style — never a locked Pro look,
 * even if a Pro style was saved earlier. This does not affect send limits.
 */
export function resolvePdfStyle(style: PdfStyle | string | undefined, pro: boolean, fallback: PdfStyle = 'modern'): PdfStyle {
  if (!isPdfStyle(style)) return fallback;
  if (isProPdfStyle(style) && !pro) return fallback;
  return style;
}

export function pdfStyleInfo(id: PdfStyle): PdfStyleInfo {
  return PDF_STYLES.find((s) => s.id === id) ?? PDF_STYLES[0];
}

/** Contact shown on /privacy, /terms and /support. Defaults to support@invoicejot.com. */
export function supportEmail(): string {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v ? v : 'support@invoicejot.com';
}

export const LEGAL_UPDATED = 'November 27, 2026';

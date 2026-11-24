/** Contact shown on /privacy and /terms. Set NEXT_PUBLIC_SUPPORT_EMAIL in Vercel before App Review. */
export function supportEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return v ? v : null;
}

export const LEGAL_UPDATED = 'November 23, 2026';

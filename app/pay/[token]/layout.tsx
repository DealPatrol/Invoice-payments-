import { Suspense } from 'react';

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>{children}</Suspense>;
}

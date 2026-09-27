'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/login' || pathname.startsWith('/pay/');

  if (isPublicPage) return children;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen flex-1">{children}</main>
    </div>
  );
}

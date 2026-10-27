'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Drawer auto-closes on navigation because it is tied to the path it was opened on.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null);

  const isPrintView = pathname === '/studio' && searchParams.get('print') === '1';
  const isPublicPage = pathname === '/login' || pathname.startsWith('/pay/') || isPrintView;

  if (isPublicPage) return children;

  return (
    <div className="flex min-h-screen">
      <div className="no-print fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="text-[var(--text)]"><Menu size={22} /></button>
        <span className="font-black text-[var(--accent)]">InvoiceOS</span>
      </div>
      {open && <div className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <div className={`no-print ${open ? 'block' : 'hidden'} lg:block`}>
        {open && (
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed left-[15rem] top-4 z-50 text-[var(--text)] lg:hidden"><X size={20} /></button>
        )}
        <Sidebar />
      </div>
      <main className="print-reset min-h-screen flex-1 pt-14 lg:ml-64 lg:pt-0">{children}</main>
    </div>
  );
}

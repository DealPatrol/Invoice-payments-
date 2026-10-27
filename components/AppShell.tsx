'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FileText, LayoutDashboard, Menu, Plus, Users, Wand2, X, Receipt } from 'lucide-react';
import { Sidebar, isActive } from './Sidebar';

const TABS = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/studio', label: 'Studio', icon: Wand2 },
  { href: '/invoices/create', label: 'New', icon: Plus, primary: true },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Drawer auto-closes on navigation because it is tied to the path it was opened on.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null);

  const isPrintView = pathname === '/studio' && (searchParams.get('print') === '1' || searchParams.get('view') === '1');
  const isPublicPage = pathname === '/login' || pathname.startsWith('/pay/') || pathname.startsWith('/i/') || pathname.startsWith('/portal/') || isPrintView;

  if (isPublicPage) return children;

  return (
    <div className="flex min-h-screen">
      <header className="no-print fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] px-4 backdrop-blur-md lg:hidden">
        <button aria-label="Open menu" onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-1.5 text-[var(--text)] hover:bg-[var(--surface-high)]"><Menu size={20} /></button>
        <span className="flex items-center gap-2 font-bold tracking-tight text-[var(--text)]"><span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--accent)] text-[var(--on-accent)]"><Receipt size={13} /></span>InvoiceOS</span>
      </header>
      {open && <div className="no-print fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <div className={`no-print ${open ? 'block' : 'hidden'} lg:block`}>
        {open && (
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed left-[15rem] top-4 z-50 rounded-full bg-white/10 p-1 text-white lg:hidden"><X size={18} /></button>
        )}
        <Sidebar />
      </div>
      <main className="print-reset min-h-screen min-w-0 flex-1 pb-24 pt-14 lg:ml-64 lg:pb-0 lg:pt-0">{children}</main>
      <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon, primary }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold ${active ? 'text-[var(--accent)]' : 'text-[var(--text-subtle)]'}`}>
                  {primary
                    ? <span className="-mt-1 grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-[var(--shadow-md)]"><Icon size={18} /></span>
                    : <Icon size={20} />}
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

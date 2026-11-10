'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, CreditCard, Plus, Users, Globe, BarChart3, Settings, Bell, DollarSign, Palette, Wand2, Receipt, Briefcase, ClipboardList, BookOpen,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const NAV_GROUPS = [
  { title: 'Workspace', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/jobs', label: 'Jobs', icon: Briefcase },
    { href: '/estimates', label: 'Estimates', icon: ClipboardList },
    { href: '/price-book', label: 'Price book', icon: BookOpen },
    { href: '/invoices', label: 'Invoices', icon: FileText },
    { href: '/studio', label: 'Invoice Studio', icon: Wand2 },
    { href: '/payments', label: 'Payments', icon: CreditCard },
    { href: '/clients', label: 'Clients', icon: Users },
  ] },
  { title: 'Grow', items: [
    { href: '/reminders', label: 'Smart reminders', icon: Bell },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/templates', label: 'Templates', icon: Palette },
    { href: '/networks', label: 'Networks', icon: Globe, badge: 'Soon' },
  ] },
  { title: 'Account', items: [
    { href: '/pricing', label: 'Pricing', icon: DollarSign },
    { href: '/settings', label: 'Settings', icon: Settings },
  ] },
];

export function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === '/') return false;
  if (href === '/invoices' && pathname.startsWith('/invoices/create')) return false;
  if (href === '/estimates' && pathname.startsWith('/estimates/new')) return false;
  if (href === '/jobs' && pathname.startsWith('/jobs/new')) return false;
  return pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)]">
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#8c4a22] text-[#fff8ef] shadow-lg shadow-black/30"><Receipt size={17} /></span>
          <span className="font-serif text-[17px] font-bold tracking-tight text-white">Invoice <span className="text-[#d08a5c]">Laboratory</span></span>
        </Link>
      </div>
      <div className="px-4 pb-2">
        <Link href="/invoices/create" className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-white/[0.08] px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.12]">
          <Plus size={16} />New invoice
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Main">
        {NAV_GROUPS.map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon, ...rest }) => {
                const active = isActive(pathname, href);
                return (
                  <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-[var(--sidebar-active)] text-white' : 'hover:bg-white/[0.04] hover:text-white'}`}>
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[#d08a5c]" />}
                    <Icon size={17} className={active ? 'text-[#e0a57c]' : 'text-white/45 group-hover:text-white/80'} />
                    {label}
                    {'badge' in rest && <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">{rest.badge as string}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
        <ThemeToggle className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white" />
        <div className="rounded-[10px] bg-white/[0.04] p-3 ring-1 ring-inset ring-white/[0.06]">
          <p className="text-xs font-semibold text-emerald-300">Zero per-invoice fees</p>
          <p className="mt-0.5 text-xs text-white/45">Stripe pass-through only</p>
        </div>
      </div>
    </aside>
  );
}

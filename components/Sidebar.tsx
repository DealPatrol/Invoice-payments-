'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Plus,
  Users,
  Globe,
  BarChart3,
  Settings,
  Bell,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { COLORS } from '@/lib/constants';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/invoices', label: 'Invoices', icon: FileText },
    { href: '/invoices/create', label: 'New Invoice', icon: Plus },
    { href: '/payments', label: 'Payments', icon: CreditCard },
    { href: '/reminders', label: 'Smart Reminders', icon: Bell },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/networks', label: 'E-Invoice Networks', icon: Globe },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/pricing', label: 'Pricing', icon: DollarSign },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="w-64 h-screen fixed left-0 top-0 border-r flex flex-col z-40"
      style={{ background: COLORS.surface, borderColor: COLORS.border }}
    >
      <div className="px-6 py-6 border-b" style={{ borderColor: COLORS.border }}>
        <div className="flex items-center gap-2">
          <Sparkles size={22} style={{ color: COLORS.accent }} />
          <h1
            className="text-xl font-black"
            style={{ color: COLORS.accent, fontFamily: '"Syne", sans-serif' }}
          >
            InvoiceOS
          </h1>
        </div>
        <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
          Pay faster. Bill smarter.
        </p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: isActive ? COLORS.accentGlow : 'transparent',
                color: isActive ? COLORS.accent : COLORS.textMuted,
              }}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5 border-t" style={{ borderColor: COLORS.border }}>
        <p className="text-xs font-bold" style={{ color: COLORS.success }}>
          Zero per-invoice fees
        </p>
        <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
          Stripe pass-through only
        </p>
      </div>
    </aside>
  );
}

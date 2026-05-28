'use client';

import { Sidebar } from '@/components/Sidebar';
import { COLORS } from '@/lib/constants';
import { TrendingUp, Calendar, PieChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="flex">
      <Sidebar />

      <main className="ml-64 flex-1 h-screen overflow-y-auto">
        <div className="p-8">
          <h1
            className="text-4xl font-black tracking-tight mb-8"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Reports & Analytics
          </h1>

          {/* Placeholder Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="rounded-lg border p-12 text-center"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <TrendingUp size={40} className="mx-auto mb-4" style={{ color: COLORS.accent }} />
              <h3 className="font-bold mb-2" style={{ color: COLORS.text }}>
                Revenue Trends
              </h3>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Coming soon
              </p>
            </div>

            <div
              className="rounded-lg border p-12 text-center"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <Calendar size={40} className="mx-auto mb-4" style={{ color: COLORS.warning }} />
              <h3 className="font-bold mb-2" style={{ color: COLORS.text }}>
                Time Analysis
              </h3>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Coming soon
              </p>
            </div>

            <div
              className="rounded-lg border p-12 text-center"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <PieChart size={40} className="mx-auto mb-4" style={{ color: COLORS.success }} />
              <h3 className="font-bold mb-2" style={{ color: COLORS.text }}>
                Client Breakdown
              </h3>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

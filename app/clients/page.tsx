'use client';

import { Sidebar } from '@/components/Sidebar';
import { COLORS, SAMPLE_CLIENTS, CURRENCY_SYMBOLS } from '@/lib/constants';
import { Mail, Globe, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const filtered = SAMPLE_CLIENTS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex">
      <Sidebar />

      <main className="ml-64 flex-1 h-screen overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-4xl font-black tracking-tight mb-2"
                style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
              >
                Clients
              </h1>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>
                Manage your customers and their invoice history
              </p>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs px-4 py-2 rounded-lg mb-8 text-sm"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
          />

          <div
            className="rounded-lg border overflow-hidden"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            {filtered.map((client) => (
              <div
                key={client.id}
                className="px-6 py-6 border-b hover:bg-white/5 transition"
                style={{ borderColor: COLORS.border }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: COLORS.text }}>
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: COLORS.textMuted }}>
                      <div className="flex items-center gap-1">
                        <Mail size={14} />
                        {client.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe size={14} />
                        {client.country}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm" style={{ color: COLORS.textMuted }}>
                      Total Billed
                    </div>
                    <div
                      className="text-xl font-bold font-mono"
                      style={{ color: COLORS.accent }}
                    >
                      {CURRENCY_SYMBOLS[client.currency]}
                      {client.totalBilled.toLocaleString()}
                    </div>
                    <div className="text-sm mt-2" style={{ color: COLORS.success }}>
                      Paid: {CURRENCY_SYMBOLS[client.currency]}
                      {client.totalPaid.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-6">
                    <button className="p-2 rounded hover:bg-white/10" style={{ color: COLORS.textMuted }}>
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 rounded hover:bg-red-900/20" style={{ color: COLORS.danger }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

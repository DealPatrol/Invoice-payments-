'use client';

import { COLORS, SAMPLE_CLIENTS } from '@/lib/constants';
import { Mail, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ClientsPage() {
  const [search, setSearch] = useState('');

  const filtered = SAMPLE_CLIENTS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-4xl font-black tracking-tight mb-2"
              style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
            >
              Clients
            </h1>
            <p style={{ color: COLORS.textMuted }}>Manage your client relationships</p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 mb-8 rounded-lg"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
        />

        <div className="grid gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="rounded-lg border p-6" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: COLORS.text }}>
                    {client.name}
                  </h3>
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    {client.country} • {client.currency}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded hover:bg-gray-100">
                    <Edit2 size={16} style={{ color: COLORS.accent }} />
                  </button>
                  <button className="p-2 rounded hover:bg-gray-100">
                    <Trash2 size={16} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail size={14} style={{ color: COLORS.textMuted }} />
                  <a href={`mailto:${client.email}`} style={{ color: COLORS.accent }}>
                    {client.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: COLORS.textMuted }}>No clients found</p>
          </div>
        )}
      </div>
    </div>
  );
}

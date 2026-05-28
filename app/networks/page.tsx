'use client';

import { Sidebar } from '@/components/Sidebar';
import { COLORS, NETWORKS } from '@/lib/constants';
import { CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

export default function NetworksPage() {
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

  const live = NETWORKS.filter((n) => n.status === 'live');
  const beta = NETWORKS.filter((n) => n.status === 'beta');

  const details: Record<string, { regions: string[] }> = {
    PEPPOL: { regions: ['40+ EU Countries', 'Norway', 'Iceland', 'UK'] },
    ZUGFeRD: { regions: ['Germany'] },
    'NF-e': { regions: ['Brazil'] },
    'JP e-Invoice': { regions: ['Japan'] },
    'AU RCTI': { regions: ['Australia'] },
  };

  return (
    <div className="flex">
      <Sidebar />

      <main className="ml-64 flex-1 h-screen overflow-y-auto">
        <div className="p-8">
          <h1
            className="text-4xl font-black tracking-tight mb-2"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Global Networks
          </h1>
          <p className="text-sm mb-12" style={{ color: COLORS.textMuted }}>
            Support for e-invoicing standards across 40+ countries
          </p>

          {/* Live Networks */}
          <h2 className="text-lg font-bold mb-6" style={{ color: COLORS.text }}>
            <CheckCircle size={20} className="inline mr-2" />
            Live Networks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {live.map((network) => (
              <div
                key={network.id}
                onClick={() => setSelectedNetwork(network.id)}
                className="rounded-lg border p-6 cursor-pointer transition-all"
                style={{
                  background: selectedNetwork === network.id ? COLORS.surfaceHigh : COLORS.surface,
                  borderColor: selectedNetwork === network.id ? COLORS.accent : COLORS.border,
                  borderWidth: selectedNetwork === network.id ? 2 : 1,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: COLORS.text }}>
                      {network.name}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                      {network.description}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: '#22c97a18', color: COLORS.success }}
                  >
                    LIVE
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Beta Networks */}
          <h2 className="text-lg font-bold mb-6" style={{ color: COLORS.text }}>
            <Clock size={20} className="inline mr-2" />
            Beta Networks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {beta.map((network) => (
              <div
                key={network.id}
                className="rounded-lg border p-6 opacity-60"
                style={{ background: COLORS.surface, borderColor: COLORS.border }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: COLORS.text }}>
                      {network.name}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                      {network.description}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: '#f5a62318', color: COLORS.warning }}
                  >
                    BETA
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          {selectedNetwork && details[selectedNetwork] && (
            <div
              className="rounded-lg border p-8"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: COLORS.text }}>
                  {selectedNetwork} Details
                </h2>
                <button
                  onClick={() => setSelectedNetwork(null)}
                  className="text-2xl"
                  style={{ color: COLORS.textMuted }}
                >
                  ✕
                </button>
              </div>
              <h3 className="text-sm font-bold uppercase mb-3" style={{ color: COLORS.textMuted }}>
                Supported Regions
              </h3>
              <div className="flex flex-wrap gap-2">
                {details[selectedNetwork].regions.map((region) => (
                  <span
                    key={region}
                    className="text-xs px-3 py-1 rounded-full"
                    style={{ background: COLORS.accentGlow, color: COLORS.accent, border: `1px solid ${COLORS.accent}33` }}
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

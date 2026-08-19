'use client';

import { COLORS, NETWORKS } from '@/lib/constants';
import { CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

export default function NetworksPage() {
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

  const live = NETWORKS.filter((n: any) => n.status === 'live');
  const beta = NETWORKS.filter((n: any) => n.status === 'beta');

  const details: Record<string, { regions: string[] }> = {
    PEPPOL: { regions: ['40+ EU Countries', 'Norway', 'Iceland', 'UK'] },
    ZUGFeRD: { regions: ['Germany'] },
    'NF-e': { regions: ['Brazil'] },
    'JP e-Invoice': { regions: ['Japan'] },
    'AU RCTI': { regions: ['Australia'] },
  };

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="p-8 max-w-6xl mx-auto">
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
          {live.map((network: any) => (
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
                  style={{ background: '#22c97a18', color: '#15803d' }}
                >
                  LIVE
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Beta Networks */}
        {beta.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-6" style={{ color: COLORS.text }}>
              <Clock size={20} className="inline mr-2" />
              Coming Soon
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {beta.map((network: any) => (
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
                      style={{ background: '#fef3c7', color: '#92400e' }}
                    >
                      BETA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedNetwork && (
          <div className="mt-12 p-6 rounded-lg" style={{ background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}` }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.text }}>
              Network Details
            </h3>
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: COLORS.text }}>
                Supported Regions:
              </p>
              <ul className="space-y-1">
                {(details[selectedNetwork as keyof typeof details]?.regions || []).map((region) => (
                  <li key={region} style={{ color: COLORS.textMuted }}>
                    • {region}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

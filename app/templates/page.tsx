'use client';

import { useState } from 'react';
import { TemplateGallery } from '@/components/TemplateGallery';
import { COLORS } from '@/lib/constants';
import { getTemplateById } from '@/lib/templates';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();

  const template = selectedTemplate ? getTemplateById(selectedTemplate) : null;

  return (
    <div style={{ background: COLORS.background, minHeight: '100vh' }}>
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-12">
            <h1
              className="text-4xl font-black mb-2 tracking-tight"
              style={{
                color: COLORS.text,
                fontFamily: '"Syne", sans-serif',
              }}
            >
              Invoice Templates
            </h1>
            <p className="text-lg" style={{ color: COLORS.textMuted }}>
              Browse and select from 80+ professional invoice templates tailored for your industry
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Gallery */}
            <div className="lg:col-span-2">
              <TemplateGallery 
                onSelectTemplate={setSelectedTemplate}
                selectedTemplateId={selectedTemplate}
              />
            </div>

            {/* Preview Panel */}
            <div>
              {template ? (
                <div
                  className="rounded-lg border p-6 sticky top-8"
                  style={{
                    background: COLORS.surface,
                    borderColor: COLORS.border,
                  }}
                >
                  <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
                    Preview
                  </h3>

                  {/* Live Preview */}
                  <div
                    className="rounded-lg p-6 mb-6 h-80"
                    style={{
                      background: template.colorScheme.background,
                      border: `2px solid ${template.colorScheme.primary}`,
                    }}
                  >
                    {/* Header */}
                    <div
                      className="rounded p-4 mb-4 h-16"
                      style={{
                        background: template.colorScheme.primary,
                        color: '#ffffff',
                      }}
                    >
                      <div className="text-sm font-bold">INVOICE</div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <div
                        className="h-3 rounded"
                        style={{
                          background: template.colorScheme.accent,
                          width: '70%',
                        }}
                      />
                      <div
                        className="h-2 rounded"
                        style={{
                          background: template.colorScheme.secondary,
                        }}
                      />
                      <div
                        className="h-2 rounded"
                        style={{
                          background: template.colorScheme.secondary,
                          width: '80%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-4 mb-6 text-sm">
                    <div>
                      <p className="font-semibold mb-1" style={{ color: COLORS.text }}>
                        Layout
                      </p>
                      <p style={{ color: COLORS.textMuted }}>
                        {template.layout.charAt(0).toUpperCase() + template.layout.slice(1)}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold mb-1" style={{ color: COLORS.text }}>
                        Industries
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.industry.map((ind) => (
                          <span
                            key={ind}
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              background: template.colorScheme.secondary,
                              color: template.colorScheme.primary,
                            }}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold mb-1" style={{ color: COLORS.text }}>
                        Colors
                      </p>
                      <div className="flex gap-2">
                        {Object.entries(template.colorScheme).slice(0, 4).map(([key, color]) => (
                          <div
                            key={key}
                            className="w-8 h-8 rounded border"
                            style={{
                              background: color,
                              borderColor: COLORS.border,
                            }}
                            title={key}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href={`/invoices/create?template=${template.id}`}
                    className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-center transition-all"
                    style={{
                      background: COLORS.accent,
                      color: '#ffffff',
                    }}
                  >
                    Use This Template
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div
                  className="rounded-lg border p-6 sticky top-8 text-center"
                  style={{
                    background: COLORS.surface,
                    borderColor: COLORS.border,
                  }}
                >
                  <p style={{ color: COLORS.textMuted }}>
                    Select a template to preview and use
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

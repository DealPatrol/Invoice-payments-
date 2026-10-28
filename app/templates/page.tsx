'use client';

import { useState } from 'react';
import { TemplateGallery } from '@/components/TemplateGallery';
import { COLORS } from '@/lib/constants';
import { getTemplateById } from '@/lib/templates';
import Link from 'next/link';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { btnPrimary, EmptyState, Page, PageHeader, Pill } from '@/components/ui/kit';

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();

  const template = selectedTemplate ? getTemplateById(selectedTemplate) : null;

  return (
    <Page>
      <PageHeader eyebrow="Grow" title="Invoice templates" subtitle="80+ professional templates tailored to your industry. Pick one to preview." />
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
                <div className="sticky top-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-[var(--text)]">{template.name}</h3><Pill tone="accent">Preview</Pill></div>

                  {/* Live Preview */}
                  <div
                    className="mb-5 h-72 rounded-[var(--radius-md)] p-5 shadow-inner"
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
                    className={btnPrimary + " w-full justify-center"}
                  >
                    Use This Template
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="sticky top-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                  <EmptyState icon={LayoutTemplate} title="No template selected" body="Select a template to preview and use it." />
                </div>
              )}
            </div>
          </div>
    </Page>
  );
}

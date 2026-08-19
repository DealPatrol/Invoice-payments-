'use client';

import { useState } from 'react';
import { INVOICE_TEMPLATES, getTemplateCategories, searchTemplates } from '@/lib/templates';
import { COLORS } from '@/lib/constants';
import { Search, Check } from 'lucide-react';

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string) => void;
  selectedTemplateId?: string;
}

export function TemplateGallery({ onSelectTemplate, selectedTemplateId }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', ...getTemplateCategories()];
  
  let filteredTemplates = searchQuery 
    ? searchTemplates(searchQuery)
    : INVOICE_TEMPLATES;
  
  if (selectedCategory !== 'All') {
    filteredTemplates = filteredTemplates.filter(t => t.category === selectedCategory);
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
          Choose Your Invoice Template
        </h2>
        <p className="text-sm" style={{ color: COLORS.textMuted }}>
          Select from {INVOICE_TEMPLATES.length}+ professional templates
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3" style={{ color: COLORS.textMuted }} />
        <input
          type="text"
          placeholder="Search templates by name, industry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg text-sm"
          style={{
            background: COLORS.surfaceHigh,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
          }}
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all"
            style={{
              background: selectedCategory === category ? COLORS.accent : COLORS.surface,
              color: selectedCategory === category ? '#ffffff' : COLORS.text,
              border: `1px solid ${selectedCategory === category ? COLORS.accent : COLORS.border}`,
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className="rounded-lg border-2 p-4 cursor-pointer transition-all hover:scale-105"
            style={{
              background: template.colorScheme.background,
              borderColor: selectedTemplateId === template.id ? COLORS.accent : COLORS.border,
              borderWidth: selectedTemplateId === template.id ? 2 : 1,
            }}
          >
            {/* Preview */}
            <div
              className="w-full h-40 rounded mb-3 p-3 relative flex flex-col justify-between"
              style={{
                background: template.colorScheme.background,
                border: `2px solid ${template.colorScheme.primary}`,
              }}
            >
              {/* Header bar preview */}
              <div
                className="w-full h-8 rounded mb-2"
                style={{ background: template.colorScheme.primary }}
              />

              {/* Content preview */}
              <div className="space-y-2 flex-1">
                <div
                  className="h-2 rounded"
                  style={{ background: template.colorScheme.accent, width: '60%' }}
                />
                <div
                  className="h-2 rounded"
                  style={{ background: template.colorScheme.secondary }}
                />
              </div>

              {/* Check mark if selected */}
              {selectedTemplateId === template.id && (
                <div
                  className="absolute top-2 right-2 rounded-full p-1"
                  style={{ background: COLORS.accent }}
                >
                  <Check size={16} color="#ffffff" />
                </div>
              )}
            </div>

            {/* Info */}
            <h3 className="font-semibold text-sm mb-1" style={{ color: COLORS.text }}>
              {template.name}
            </h3>
            <p className="text-xs mb-2" style={{ color: COLORS.textMuted }}>
              {template.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {template.industry.slice(0, 2).map((ind) => (
                <span
                  key={ind}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: COLORS.accentGlow || template.colorScheme.secondary,
                    color: template.colorScheme.primary,
                  }}
                >
                  {ind}
                </span>
              ))}
              {template.industry.length > 2 && (
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: COLORS.accentGlow || template.colorScheme.secondary,
                    color: template.colorScheme.primary,
                  }}
                >
                  +{template.industry.length - 2}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p style={{ color: COLORS.textMuted }}>No templates found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

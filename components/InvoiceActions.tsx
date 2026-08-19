'use client';

import { useState } from 'react';
import { Copy, Mail, Download, Eye, Printer } from 'lucide-react';
import { COLORS } from '@/lib/constants';

interface InvoiceActionsProps {
  invoiceNumber: string;
  clientEmail: string;
  onDuplicate: () => Promise<void>;
  onPreview?: () => void;
}

export function InvoiceActions({
  invoiceNumber,
  clientEmail,
  onDuplicate,
  onPreview,
}: InvoiceActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      await onDuplicate();
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    window.open(
      `mailto:${clientEmail}?subject=Invoice ${invoiceNumber}&body=Please find attached your invoice ${invoiceNumber}`,
      '_blank'
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 rounded-lg font-medium transition-all text-sm"
        style={{
          background: COLORS.accent,
          color: '#ffffff',
        }}
      >
        Actions
      </button>

      {showMenu && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg border shadow-lg z-10"
          style={{ background: COLORS.surface, borderColor: COLORS.border }}
        >
          <button
            onClick={onPreview}
            className="w-full text-left px-4 py-3 hover:bg-opacity-50 flex items-center gap-2 transition-all border-b"
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            <Eye size={16} />
            Preview
          </button>

          <button
            onClick={handlePrint}
            className="w-full text-left px-4 py-3 hover:bg-opacity-50 flex items-center gap-2 transition-all border-b"
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            <Printer size={16} />
            Print
          </button>

          <button
            onClick={handleEmail}
            className="w-full text-left px-4 py-3 hover:bg-opacity-50 flex items-center gap-2 transition-all border-b"
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            <Mail size={16} />
            Email Client
          </button>

          <button
            onClick={handleDuplicate}
            disabled={loading}
            className="w-full text-left px-4 py-3 hover:bg-opacity-50 flex items-center gap-2 transition-all border-b disabled:opacity-50"
            style={{ borderColor: COLORS.border, color: COLORS.text }}
          >
            <Copy size={16} />
            {loading ? 'Duplicating...' : 'Duplicate'}
          </button>

          <button
            onClick={() => setShowMenu(false)}
            className="w-full text-left px-4 py-3 hover:bg-opacity-50 flex items-center gap-2 transition-all"
            style={{ color: COLORS.text }}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      )}
    </div>
  );
}

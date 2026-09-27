'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  COLORS,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  COUNTRIES,
  NETWORKS,
  SAMPLE_CLIENTS,
} from '@/lib/constants';
import { getTemplateById } from '@/lib/templates';
import Link from 'next/link';
import { Plus, Trash2, Palette } from 'lucide-react';
import { useState } from 'react';

const COUNTRY_TAX: Record<string, number> = {
  'United States': 0.08,
  'United Kingdom': 0.2,
  Germany: 0.19,
  France: 0.2,
  Canada: 0.13,
  Australia: 0.1,
  Japan: 0.1,
  Brazil: 0.17,
  India: 0.18,
  Mexico: 0.16,
};

export function CreateInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateParam = searchParams?.get('template') || null;
  
  const selectedTemplate = templateParam || undefined;
  let template = null;
  try {
    template = selectedTemplate ? getTemplateById(selectedTemplate) : null;
  } catch (e) {
    template = null;
  }

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [network, setNetwork] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [lateFeePercent, setLateFeePercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(8);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: 1, unitRate: 0 },
  ]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitRate, 0);
  const taxRate = taxPercent / 100;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  function pickClient(id: string) {
    const c = SAMPLE_CLIENTS.find((x) => String(x.id) === id);
    if (!c) return;
    setClientName(c.name);
    setClientEmail(c.email);
    setCountry(c.country);
    setCurrency(c.currency);
    setTaxPercent((COUNTRY_TAX[c.country] ?? 0.1) * 100);
  }

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unitRate: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!clientName) {
        throw new Error('Client name is required');
      }
      if (items.length === 0) {
        throw new Error('At least one line item is required');
      }

      const payload = {
        clientName,
        clientEmail,
        country,
        currency,
        network,
        dueDate,
        notes,
        taxRate: taxPercent / 100,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitRate: i.unitRate,
        })),
        recurring,
        lateFeePercent,
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Template Selector */}
      <div
        className="rounded-lg border p-6 mb-8 flex items-center justify-between"
        style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
      >
        <div className="flex items-center gap-3">
          <Palette size={20} style={{ color: COLORS.accent }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: COLORS.text }}>
              {template ? `Template: ${template.name}` : 'Choose a Template'}
            </p>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              {template ? template.description : 'Browse 80+ professional templates'}
            </p>
          </div>
        </div>
        <Link
          href="/templates"
          className="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          style={{
            background: COLORS.accent,
            color: '#ffffff',
          }}
        >
          Browse Templates
        </Link>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
        >
          <label className="text-xs font-bold uppercase" style={{ color: COLORS.textMuted }}>
            Quick fill from client
          </label>
          <select
            onChange={(e) => pickClient(e.target.value)}
            className="w-full px-4 py-2 rounded-lg"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
            defaultValue=""
          >
            <option value="">Choose a client…</option>
            {SAMPLE_CLIENTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Client name *"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
          />
          <input
            type="email"
            placeholder="Client email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setTaxPercent((COUNTRY_TAX[e.target.value] ?? 0.1) * 100);
              }}
              className="px-4 py-2 rounded-lg"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
            >
              {COUNTRIES.slice(0, 15).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
            />
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
            >
              <option value="">Network (optional)</option>
              {NETWORKS.map((n: any) => (
                <option key={n.id} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Line Items */}
        <div
          className="rounded-lg border p-6"
          style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
        >
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-bold" style={{ color: COLORS.text }}>
              Items
            </label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded"
              style={{ background: COLORS.accentGlow, color: COLORS.accent }}
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="mb-4 pb-4 border-b last:border-0" style={{ borderColor: COLORS.border }}>
              <input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                className="w-full px-3 py-2 mb-2 rounded-lg text-sm"
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  value={item.unitRate}
                  onChange={(e) => updateItem(idx, 'unitRate', parseFloat(e.target.value) || 0)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                    {CURRENCIES.includes(currency) && CURRENCY_SYMBOLS[currency]}
                    {(item.quantity * item.unitRate).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded hover:bg-red-100"
                  >
                    <Trash2 size={14} style={{ color: '#dc2626' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t" style={{ borderColor: COLORS.border }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.textMuted }}>Subtotal</span>
              <span style={{ color: COLORS.text }}>
                {CURRENCY_SYMBOLS[currency]}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <span style={{ color: COLORS.textMuted }}>Tax ({taxPercent}%)</span>
              </div>
              <span style={{ color: COLORS.text }}>
                {CURRENCY_SYMBOLS[currency]}
                {taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: COLORS.border }}>
              <span style={{ color: COLORS.text }}>Total</span>
              <span style={{ color: COLORS.accent }}>
                {CURRENCY_SYMBOLS[currency]}
                {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Options */}
        <div
          className="rounded-lg border p-6 space-y-4"
          style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
        >
          <textarea
            placeholder="Notes (visible to client)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 rounded-lg text-sm"
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="rounded"
            />
            <span style={{ color: COLORS.text }}>This is a recurring invoice</span>
          </label>
          <label className="block">
            <span className="text-sm" style={{ color: COLORS.text }}>
              Optional overdue late fee (%)
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={lateFeePercent}
              onChange={(event) => setLateFeePercent(Number(event.target.value) || 0)}
              className="mt-2 w-full px-4 py-2 rounded-lg"
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
            />
          </label>
        </div>

        {error && (
          <div
            className="p-4 rounded-lg text-sm"
            style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 font-semibold rounded-lg transition-all disabled:opacity-50"
          style={{
            background: COLORS.accent,
            color: '#ffffff',
          }}
        >
          {saving ? 'Creating…' : 'Create Invoice'}
        </button>
      </form>
    </>
  );
}

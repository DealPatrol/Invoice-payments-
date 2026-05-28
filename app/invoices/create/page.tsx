'use client';

import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import {
  COLORS,
  CURRENCIES,
  CURRENCY_SYMBOLS,
  COUNTRIES,
  NETWORKS,
  TAX_RATES,
  SAMPLE_CLIENTS,
} from '@/lib/constants';
import { Plus, Trash2 } from 'lucide-react';
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

export default function CreateInvoicePage() {
  const router = useRouter();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [network, setNetwork] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [lateFeePercent, setLateFeePercent] = useState(1.5);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Client name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientEmail,
          country,
          currency,
          network: network || undefined,
          dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          notes,
          taxRate,
          items: items.filter((i) => i.description || i.unitRate > 0),
          recurring,
          lateFeePercent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed');
      router.push('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: COLORS.background }}>
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen overflow-y-auto">
        <div className="p-8 max-w-4xl">
          <h1
            className="text-4xl font-black tracking-tight mb-2"
            style={{ color: COLORS.text, fontFamily: '"Syne", sans-serif' }}
          >
            Create Invoice
          </h1>
          <p className="text-sm mb-8" style={{ color: COLORS.textMuted }}>
            Auto late-fee rules · recurring billing · instant client pay link
          </p>

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
                  <option value="">No e-invoice network</option>
                  {NETWORKS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                />
                Recurring invoice (monthly template)
              </label>
              <label className="text-sm" style={{ color: COLORS.textMuted }}>
                Late fee % after due date:{' '}
                <input
                  type="number"
                  step="0.1"
                  value={lateFeePercent}
                  onChange={(e) => setLateFeePercent(parseFloat(e.target.value))}
                  className="w-16 ml-2 px-2 py-1 rounded"
                  style={{
                    background: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                />
              </label>
            </div>

            <div
              className="rounded-lg border p-6"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <h3 className="font-bold mb-4" style={{ color: COLORS.text }}>
                Line items
              </h3>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 mb-3">
                  <input
                    className="col-span-6 px-3 py-2 rounded-lg text-sm"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].description = e.target.value;
                      setItems(next);
                    }}
                    style={{
                      background: COLORS.surfaceHigh,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.text,
                    }}
                  />
                  <input
                    type="number"
                    className="col-span-2 px-3 py-2 rounded-lg text-sm"
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].quantity = parseFloat(e.target.value) || 0;
                      setItems(next);
                    }}
                    style={{
                      background: COLORS.surfaceHigh,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.text,
                    }}
                  />
                  <input
                    type="number"
                    className="col-span-3 px-3 py-2 rounded-lg text-sm"
                    value={item.unitRate}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].unitRate = parseFloat(e.target.value) || 0;
                      setItems(next);
                    }}
                    style={{
                      background: COLORS.surfaceHigh,
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.text,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="col-span-1"
                    style={{ color: COLORS.danger }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setItems([...items, { description: '', quantity: 1, unitRate: 0 }])
                }
                className="flex items-center gap-2 text-sm font-bold mt-2"
                style={{ color: COLORS.accent }}
              >
                <Plus size={16} /> Add line
              </button>
            </div>

            <div className="flex gap-4 items-center">
              <label className="text-sm" style={{ color: COLORS.textMuted }}>
                Tax %
              </label>
              <select
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value))}
                className="px-3 py-2 rounded-lg"
                style={{
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
              >
                {TAX_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Notes / payment terms"
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

            <div
              className="rounded-lg border p-6 max-w-sm ml-auto"
              style={{ background: COLORS.surfaceHigh, borderColor: COLORS.border }}
            >
              <p className="flex justify-between text-sm mb-2" style={{ color: COLORS.textMuted }}>
                <span>Subtotal</span>
                <span className="font-mono">
                  {CURRENCY_SYMBOLS[currency]}
                  {subtotal.toFixed(2)}
                </span>
              </p>
              <p className="flex justify-between text-sm mb-2" style={{ color: COLORS.textMuted }}>
                <span>Tax</span>
                <span className="font-mono">
                  {CURRENCY_SYMBOLS[currency]}
                  {taxAmount.toFixed(2)}
                </span>
              </p>
              <p
                className="flex justify-between font-black text-lg pt-2 border-t"
                style={{ color: COLORS.accent, borderColor: COLORS.border }}
              >
                <span>Total</span>
                <span className="font-mono">
                  {CURRENCY_SYMBOLS[currency]}
                  {total.toFixed(2)}
                </span>
              </p>
            </div>

            {error && (
              <p className="text-sm" style={{ color: COLORS.danger }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-lg font-bold disabled:opacity-50"
              style={{ background: COLORS.accent, color: '#fff' }}
            >
              {saving ? 'Creating…' : 'Create Invoice'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoice, getDashboardStats, CURRENCY_SYMBOLS, TAX_RATES } from '../lib/supabase';

const COLORS = {
  bg: "#0a0d14", surface: "#111520", surfaceHigh: "#161b2e",
  border: "#1e2540", borderHigh: "#2a3356", accent: "#4f6ef7",
  accentGlow: "#4f6ef733", accentHover: "#6b85ff", success: "#22c97a",
  warning: "#f5a623", danger: "#f7524f", text: "#e8ecf8",
  textMuted: "#7a85a8", textDim: "#3d4466", gold: "#f0c040",
};

const STATUS_CONFIG = {
  paid: { color: COLORS.success, bg: "#22c97a18", label: "Paid" },
  pending: { color: COLORS.warning, bg: "#f5a62318", label: "Pending" },
  overdue: { color: COLORS.danger, bg: "#f7524f18", label: "Overdue" },
  draft: { color: COLORS.textMuted, bg: "#7a85a818", label: "Draft" },
  sent: { color: COLORS.accent, bg: "#4f6ef718", label: "Sent" },
};

const COUNTRIES = ["United States","United Kingdom","Germany","France","Canada","Australia","Japan","Brazil","India","Mexico"];
const CURRENCIES = ["USD","EUR","GBP","CAD","AUD","JPY","BRL","INR","MXN"];
const NETWORKS = [
  { id: "PEPPOL", name: "PEPPOL", desc: "Pan-European network, 40+ countries" },
  { id: "ZUGFeRD", name: "ZUGFeRD", desc: "German e-invoice standard" },
  { id: "NF-e", name: "NF-e / SPED", desc: "Brazilian fiscal network" },
  { id: "JP e-Invoice", name: "JP e-Invoice", desc: "Japan invoice standard" },
  { id: "AU RCTI", name: "AU RCTI", desc: "Australian invoice standard" },
  { id: "FatturaPA", name: "FatturaPA", desc: "Italian e-invoice standard" },
];

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      border: `1px solid ${cfg.color}33`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color }} />
      {cfg.label.toUpperCase()}
    </span>
  );
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.text }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const nav = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "invoices", icon: "◈", label: "Invoices" },
    { id: "create", icon: "✦", label: "New Invoice" },
    { id: "settings", icon: "◌", label: "Settings" },
  ];
  return (
    <div style={{
      width: 220, minHeight: "100vh", background: COLORS.surface,
      borderRight: `1px solid ${COLORS.border}`,
      display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0,
    }}>
      <div style={{ padding: "0 20px 28px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${COLORS.accent}, #8b5cf6)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: "#fff",
          }}>I</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.text }}>InvoiceOS</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted }}>Collins Lawncare</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 12px", flex: 1 }}>
        {nav.map(item => (
          <div key={item.id} onClick={() => setActive(item.id)} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 8, cursor: "pointer",
            marginBottom: 2,
            background: active === item.id ? COLORS.accentGlow : "transparent",
            color: active === item.id ? COLORS.accent : COLORS.textMuted,
            fontWeight: active === item.id ? 700 : 500,
            fontSize: 13, border: `1px solid ${active === item.id ? COLORS.accent + "44" : "transparent"}`,
          }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>Cole Collins</div>
        <div style={{ fontSize: 10, color: COLORS.textMuted }}>Admin</div>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
    getInvoices({ limit: 5 }).then(setInvoices).catch(console.error);
  }, []);

  if (!stats) return <div style={{ color: COLORS.textMuted, padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>Dashboard</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Collins Lawncare & Services</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <MetricCard label="Total Revenue" value={`$${(stats.total_revenue / 1000).toFixed(1)}k`} icon="💰" color={COLORS.success} sub="All time" />
        <MetricCard label="Collected" value={`$${(stats.collected / 1000).toFixed(1)}k`} icon="✅" color={COLORS.success} sub="Paid invoices" />
        <MetricCard label="Outstanding" value={stats.outstanding_count} icon="📤" color={COLORS.warning} sub="Awaiting payment" />
        <MetricCard label="Overdue" value={stats.overdue_count} icon="⚠️" color={COLORS.danger} sub="Requires follow-up" />
      </div>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Recent Invoices</span>
          <button onClick={() => onNavigate("invoices")} style={{ background: "none", border: "none", color: COLORS.accent, cursor: "pointer", fontSize: 12 }}>View all →</button>
        </div>
        {invoices.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>
            No invoices yet. <span onClick={() => onNavigate("create")} style={{ color: COLORS.accent, cursor: "pointer" }}>Create your first one →</span>
          </div>
        )}
        {invoices.map(inv => {
          const sym = CURRENCY_SYMBOLS[inv.currency] || "$";
          return (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, gap: 16 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.accent, minWidth: 120 }}>{inv.invoice_number}</div>
              <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{inv.client_name}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.text }}>{sym}{Number(inv.total).toLocaleString()}</div>
              <Badge​​​​​​​​​​​​​​​​

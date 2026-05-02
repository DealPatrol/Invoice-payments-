'use client';
import { useState, useEffect, useCallback } from 'react';
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

// ── Shared primitives ──────────────────────────────────────────────────────────

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

function Btn({ children, onClick, variant = "primary", disabled, small, style = {}, type = "button" }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: small ? "6px 14px" : "10px 20px",
    borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 12 : 13, fontWeight: 700,
    border: "1px solid transparent", transition: "opacity .15s",
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  const variants = {
    primary: { background: COLORS.accent, color: "#fff", borderColor: COLORS.accent },
    ghost: { background: "transparent", color: COLORS.textMuted, borderColor: COLORS.border },
    danger: { background: "#f7524f1a", color: COLORS.danger, borderColor: `${COLORS.danger}44` },
    success: { background: "#22c97a1a", color: COLORS.success, borderColor: `${COLORS.success}44` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required, options, style = {} }) {
  const field = options ? (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`,
      borderRadius: 8, padding: "9px 12px", color: COLORS.text,
      fontSize: 13, width: "100%", outline: "none",
    }}>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  ) : (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      style={{
        background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`,
        borderRadius: 8, padding: "9px 12px", color: COLORS.text,
        fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box",
        ...style,
      }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.5 }}>{label.toUpperCase()}</label>}
      {field}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

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

// ── Dashboard ──────────────────────────────────────────────────────────────────

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
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Collins Lawncare &amp; Services</div>
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
        {invoices.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>
            No invoices yet. <span onClick={() => onNavigate("create")} style={{ color: COLORS.accent, cursor: "pointer" }}>Create your first one →</span>
          </div>
        ) : (
          invoices.map(inv => {
            const sym = CURRENCY_SYMBOLS[inv.currency] || "$";
            return (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, gap: 16 }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.accent, minWidth: 120 }}>{inv.invoice_number}</div>
                <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{inv.client_name}</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.text }}>{sym}{Number(inv.total).toLocaleString()}</div>
                <Badge status={inv.status} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Invoice List ───────────────────────────────────────────────────────────────

function InvoiceList({ onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getInvoices({ status: filterStatus, search }).then(data => {
      setInvoices(data);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, status) {
    setActionError("");
    try {
      await updateInvoiceStatus(id, status);
      load();
      if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
    } catch (e) { setActionError(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setActionError("");
    try {
      await deleteInvoice(id);
      setSelected(null);
      load();
    } catch (e) { setActionError(e.message); }
  }

  const statusOpts = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>Invoices</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</div>
        </div>
        <Btn onClick={() => onNavigate("create")}>+ New Invoice</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by client or invoice #..."
          style={{
            flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: "9px 14px", color: COLORS.text, fontSize: 13, outline: "none",
          }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 8, padding: "9px 12px", color: COLORS.text, fontSize: 13, outline: "none",
        }}>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {actionError && (
        <div style={{ background: "#f7524f18", border: `1px solid ${COLORS.danger}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: COLORS.danger, fontSize: 13 }}>
          {actionError}
        </div>
      )}

      {/* Table */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px 110px 80px 140px", padding: "10px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
          {["Invoice #","Client","Amount","Status","Due","Actions"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.7 }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {loading && <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>Loading...</div>}
        {!loading && invoices.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: COLORS.textMuted }}>
            No invoices found. <span onClick={() => onNavigate("create")} style={{ color: COLORS.accent, cursor: "pointer" }}>Create one →</span>
          </div>
        )}
        {invoices.map(inv => {
          const sym = CURRENCY_SYMBOLS[inv.currency] || "$";
          const isSelected = selected?.id === inv.id;
          return (
            <div key={inv.id} onClick={() => setSelected(isSelected ? null : inv)} style={{
              display: "grid", gridTemplateColumns: "140px 1fr 120px 110px 80px 140px",
              padding: "13px 20px", borderBottom: `1px solid ${COLORS.border}`,
              cursor: "pointer", alignItems: "center",
              background: isSelected ? COLORS.accentGlow : "transparent",
              transition: "background .15s",
            }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: COLORS.accent }}>{inv.invoice_number}</div>
              <div>
                <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 600 }}>{inv.client_name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{inv.client_email}</div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.text }}>
                {sym}{Number(inv.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <Badge status={inv.status} />
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
              </div>
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                {inv.status !== "paid" && (
                  <Btn small variant="success" onClick={() => handleStatusChange(inv.id, "paid")}>Mark Paid</Btn>
                )}
                <Btn small variant="danger" onClick={() => handleDelete(inv.id)}>Delete</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} onDelete={handleDelete} />
      )}
    </div>
  );
}

// ── Invoice Detail Panel ───────────────────────────────────────────────────────

function InvoiceDetail({ invoice: inv, onClose, onStatusChange, onDelete }) {
  const sym = CURRENCY_SYMBOLS[inv.currency] || "$";
  const statusOpts = ["draft","sent","pending","paid","overdue"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0a0d14cc", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, width: 560, maxHeight: "85vh", overflowY: "auto",
        padding: 32,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.accent, marginBottom: 4 }}>{inv.invoice_number}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{inv.client_name}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>{inv.client_email}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            ["Country", inv.country || "—"],
            ["Currency", inv.currency],
            ["Network", inv.network || "—"],
            ["Due Date", inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"],
            ["Created", new Date(inv.created_at).toLocaleDateString()],
            ["Paid Date", inv.paid_date || "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ background: COLORS.surfaceHigh, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>{k.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: COLORS.text }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Line items */}
        {inv.invoice_items?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>LINE ITEMS</div>
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
              {inv.invoice_items.map((item, i) => (
                <div key={i} style={{ display: "flex", padding: "10px 14px", borderBottom: i < inv.invoice_items.length - 1 ? `1px solid ${COLORS.border}` : "none", gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{item.description}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>×{item.quantity}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, color: COLORS.text }}>{sym}{Number(item.unit_rate).toFixed(2)}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: COLORS.text }}>{sym}{(item.quantity * item.unit_rate).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div style={{ background: COLORS.surfaceHigh, borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
          {[
            ["Subtotal", `${sym}${Number(inv.subtotal).toFixed(2)}`],
            [`Tax (${(inv.tax_rate * 100).toFixed(0)}%)`, `${sym}${Number(inv.tax_amount).toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>{k}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.text }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>Total</span>
            <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: COLORS.accent }}>{sym}{Number(inv.total).toFixed(2)}</span>
          </div>
        </div>

        {inv.notes && (
          <div style={{ background: COLORS.surfaceHigh, borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>NOTES</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>{inv.notes}</div>
          </div>
        )}

        {/* Status control */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge status={inv.status} />
          <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>Change status:</span>
          {statusOpts.filter(s => s !== inv.status).map(s => (
            <Btn key={s} small variant="ghost" onClick={() => onStatusChange(inv.id, s)}>{STATUS_CONFIG[s].label}</Btn>
          ))}
          <Btn small variant="danger" onClick={() => onDelete(inv.id)}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Create Invoice ─────────────────────────────────────────────────────────────

const EMPTY_ITEM = { desc: "", qty: "1", rate: "" };

function CreateInvoice({ onSuccess }) {
  const [form, setForm] = useState({
    client: "", email: "", country: "United States",
    currency: "USD", network: "", dueDate: "", notes: "",
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
  const taxRate = TAX_RATES[form.country] || 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const sym = CURRENCY_SYMBOLS[form.currency] || "$";

  function addItem() { setItems(p => [...p, { ...EMPTY_ITEM }]); }
  function removeItem(i) { setItems(p => p.filter((_, idx) => idx !== i)); }
  function setItem(i, k, v) { setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client.trim()) { setError("Client name is required."); return; }
    if (items.every(i => !i.desc && !i.rate)) { setError("Add at least one line item."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const inv = await createInvoice({ ...form, items });
      setSuccess(`Invoice ${inv.invoice_number} created!`);
      setForm({ client: "", email: "", country: "United States", currency: "USD", network: "", dueDate: "", notes: "" });
      setItems([{ ...EMPTY_ITEM }]);
      if (onSuccess) setTimeout(() => onSuccess(inv), 1200);
    } catch (err) {
      setError(err.message || "Failed to create invoice.");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>New Invoice</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Create an invoice for a client</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Client Details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Input label="Client Name" value={form.client} onChange={v => set("client", v)} placeholder="Acme Corp" required />
                <Input label="Email" type="email" value={form.email} onChange={v => set("email", v)} placeholder="billing@acme.com" />
                <Input label="Country" value={form.country} onChange={v => set("country", v)} options={COUNTRIES} />
              </div>
            </div>

            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Invoice Settings</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Input label="Currency" value={form.currency} onChange={v => set("currency", v)} options={CURRENCIES} />
                <Input label="Due Date" type="date" value={form.dueDate} onChange={v => set("dueDate", v)} />
                <Input label="E-Invoice Network (optional)" value={form.network} onChange={v => set("network", v)}
                  options={[{ value: "", label: "None" }, ...NETWORKS.map(n => ({ value: n.id, label: n.name }))]} />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Line Items</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 32px", gap: 6, marginBottom: 8 }}>
                {["Description","Qty","Rate",""].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: COLORS.textDim, letterSpacing: 0.5 }}>{h}</div>
                ))}
              </div>

              {items.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px 32px", gap: 6, marginBottom: 8 }}>
                  <input value={item.desc} onChange={e => setItem(i, "desc", e.target.value)} placeholder="Service description"
                    style={{ background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 10px", color: COLORS.text, fontSize: 12, outline: "none" }} />
                  <input value={item.qty} onChange={e => setItem(i, "qty", e.target.value)} type="number" min="0" placeholder="1"
                    style={{ background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 8px", color: COLORS.text, fontSize: 12, outline: "none", textAlign: "center" }} />
                  <input value={item.rate} onChange={e => setItem(i, "rate", e.target.value)} type="number" min="0" step="0.01" placeholder="0.00"
                    style={{ background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 8px", color: COLORS.text, fontSize: 12, outline: "none", textAlign: "right" }} />
                  <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                    style={{ background: "none", border: "none", color: COLORS.danger, cursor: items.length === 1 ? "default" : "pointer", fontSize: 14, opacity: items.length === 1 ? 0.3 : 1 }}>✕</button>
                </div>
              ))}

              <button type="button" onClick={addItem} style={{
                background: "none", border: `1px dashed ${COLORS.border}`, borderRadius: 6,
                color: COLORS.textMuted, cursor: "pointer", width: "100%",
                padding: "7px 0", fontSize: 12, marginTop: 4,
              }}>+ Add line item</button>

              {/* Totals preview */}
              <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
                {[
                  ["Subtotal", `${sym}${subtotal.toFixed(2)}`],
                  [`Tax (${(taxRate * 100).toFixed(0)}%)`, `${sym}${tax.toFixed(2)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{k}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>Total</span>
                  <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 900, color: COLORS.accent }}>{sym}{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Notes</div>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Payment terms, thank you message, etc."
                rows={4}
                style={{
                  width: "100%", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`,
                  borderRadius: 8, padding: "10px 12px", color: COLORS.text,
                  fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box",
                }} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "#f7524f18", border: `1px solid ${COLORS.danger}44`, borderRadius: 8, padding: "10px 14px", marginTop: 16, color: COLORS.danger, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "#22c97a18", border: `1px solid ${COLORS.success}44`, borderRadius: 8, padding: "10px 14px", marginTop: 16, color: COLORS.success, fontSize: 13 }}>
            {success}
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Btn type="button" variant="ghost" onClick={() => {
            setForm({ client: "", email: "", country: "United States", currency: "USD", network: "", dueDate: "", notes: "" });
            setItems([{ ...EMPTY_ITEM }]);
            setError(""); setSuccess("");
          }}>Reset</Btn>
          <Btn disabled={saving}>{saving ? "Creating…" : "Create Invoice"}</Btn>
        </div>
      </form>
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────

function Settings() {
  const [bizName, setBizName] = useState("Collins Lawncare & Services");
  const [bizEmail, setBizEmail] = useState("cole@collinslawncare.com");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultCountry, setDefaultCountry] = useState("United States");
  const [saved, setSaved] = useState(false);

  function save(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>Settings</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>Business profile and preferences</div>
      </div>

      <form onSubmit={save}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Business Profile</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Input label="Business Name" value={bizName} onChange={setBizName} />
                <Input label="Email" type="email" value={bizEmail} onChange={setBizEmail} />
                <Input label="Phone" value={bizPhone} onChange={setBizPhone} placeholder="+1 (555) 000-0000" />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.5 }}>ADDRESS</label>
                  <textarea value={bizAddress} onChange={e => setBizAddress(e.target.value)}
                    placeholder="123 Main St, Anytown, USA" rows={3}
                    style={{
                      background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`,
                      borderRadius: 8, padding: "9px 12px", color: COLORS.text,
                      fontSize: 13, outline: "none", resize: "vertical",
                    }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Invoice Defaults</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Input label="Default Currency" value={defaultCurrency} onChange={setDefaultCurrency} options={CURRENCIES} />
                <Input label="Default Country (for tax)" value={defaultCountry} onChange={setDefaultCountry} options={COUNTRIES} />
              </div>
            </div>

            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Tax Rates by Country</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(TAX_RATES).map(([country, rate]) => (
                  <div key={country} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{country}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.text }}>{(rate * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
          {saved && <span style={{ fontSize: 13, color: COLORS.success }}>Settings saved.</span>}
          <Btn>Save Settings</Btn>
        </div>
      </form>
    </div>
  );
}

// ── App root ───────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("dashboard");

  function navigate(p) { setPage(p); }

  const content = {
    dashboard: <Dashboard onNavigate={navigate} />,
    invoices: <InvoiceList onNavigate={navigate} />,
    create: <CreateInvoice onSuccess={() => navigate("invoices")} />,
    settings: <Settings />,
  }[page] || null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: COLORS.text }}>
      <Sidebar active={page} setActive={navigate} />
      <main style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {content}
      </main>
    </div>
  );
}

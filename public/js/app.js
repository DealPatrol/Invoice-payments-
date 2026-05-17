/* ===================================================================
   InvoicePay – Single-Page Application
   =================================================================== */
'use strict';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ---------- helpers ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = null;
function toast(msg, type = 'success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 3000);
}

/* ---------- navigation ---------- */
const VIEWS = ['dashboard', 'invoices', 'customers', 'invoice-form', 'customer-form', 'invoice-detail'];

function showView(name) {
  VIEWS.forEach(v => {
    const el = $(`#view-${v}`);
    if (el) el.classList.toggle('active', v === name);
  });
  $$('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.view === name);
  });
}

function setTitle(title, actions = '') {
  $('#page-title').textContent = title;
  $('#topbar-actions').innerHTML = actions;
}

/* ================================================================
   DASHBOARD
================================================================ */
async function loadDashboard() {
  showView('dashboard');
  setTitle('Dashboard');

  try {
    const [invoices, customers] = await Promise.all([
      api('GET', '/invoices'),
      api('GET', '/customers'),
    ]);

    const total      = invoices.reduce((s, i) => s + i.total, 0);
    const paid       = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + (i.total - i.amount_paid), 0);
    const overdue    = invoices.filter(i => i.status === 'overdue').length;

    $('#stats-grid').innerHTML = `
      <div class="stat-card primary"><div class="label">Total Invoiced</div><div class="value">${fmt(total)}</div></div>
      <div class="stat-card success"><div class="label">Amount Collected</div><div class="value">${fmt(paid)}</div></div>
      <div class="stat-card warning"><div class="label">Outstanding</div><div class="value">${fmt(outstanding)}</div></div>
      <div class="stat-card danger"><div class="label">Overdue Invoices</div><div class="value">${overdue}</div></div>
      <div class="stat-card"><div class="label">Customers</div><div class="value">${customers.length}</div></div>
    `;

    const recent = invoices.slice(0, 10);
    $('#recent-invoices-table').innerHTML = recent.length
      ? renderInvoiceTable(recent, true)
      : emptyState('No invoices yet. Create your first invoice!');
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ================================================================
   INVOICES
================================================================ */
async function loadInvoices() {
  showView('invoices');
  setTitle('Invoices', `<button class="btn btn-primary" onclick="startNewInvoice()">+ New Invoice</button>`);

  try {
    const invoices = await api('GET', '/invoices');
    $('#invoices-table-wrap').innerHTML = invoices.length
      ? renderInvoiceTable(invoices, false)
      : emptyState('No invoices yet. Click "New Invoice" to get started.');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderInvoiceTable(invoices, compact) {
  const rows = invoices.map(inv => `
    <tr>
      <td><a href="#" class="link" onclick="loadInvoiceDetail('${inv.id}')">${escHtml(inv.invoice_number)}</a></td>
      <td>${escHtml(inv.customer_name)}</td>
      <td>${inv.issue_date}</td>
      <td>${inv.due_date}</td>
      <td>${badge(inv.status)}</td>
      <td style="text-align:right">${fmt(inv.total)}</td>
      ${!compact ? `<td><div class="table-actions">
        <button class="btn btn-icon" title="View" onclick="loadInvoiceDetail('${inv.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div></td>` : ''}
    </tr>`).join('');

  return `<div class="card table-wrap"><table>
    <thead><tr>
      <th>Invoice #</th><th>Customer</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th style="text-align:right">Total</th>
      ${!compact ? '<th>Actions</th>' : ''}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

/* ================================================================
   INVOICE DETAIL
================================================================ */
async function loadInvoiceDetail(id) {
  showView('invoice-detail');

  try {
    const inv = await api('GET', `/invoices/${id}`);
    setTitle(`Invoice ${inv.invoice_number}`, `
      <button class="btn btn-secondary" onclick="loadInvoices()">← Back</button>
      ${inv.status === 'draft' ? `<button class="btn btn-primary" onclick="sendInvoice('${id}')">Mark as Sent</button>` : ''}
      ${['sent','overdue'].includes(inv.status) ? `<button class="btn btn-success" onclick="openPaymentModal('${id}', ${inv.balance_due})">Record Payment</button>` : ''}
      ${['draft','cancelled'].includes(inv.status) ? `<button class="btn btn-danger" onclick="deleteInvoice('${id}')">Delete</button>` : ''}
    `);

    const itemRows = inv.items.map(item => `
      <tr>
        <td>${escHtml(item.description)}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${fmt(item.unit_price)}</td>
        <td style="text-align:right">${fmt(item.quantity * item.unit_price)}</td>
      </tr>`).join('');

    const paymentRows = inv.payments.length ? inv.payments.map(p => `
      <tr>
        <td>${p.payment_date}</td>
        <td>${escHtml(p.method.replace(/_/g,' '))}</td>
        <td style="text-align:right">${fmt(p.amount)}</td>
        <td>${escHtml(p.notes || '—')}</td>
        <td><button class="btn btn-icon btn-sm" onclick="deletePayment('${p.id}','${id}')" title="Delete payment">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button></td>
      </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:#9ca3af">No payments recorded</td></tr>`;

    $('#invoice-detail-wrap').innerHTML = `
      <div class="card" style="padding:28px;max-width:860px">
        <div class="invoice-detail-header">
          <div>
            <div style="font-size:22px;font-weight:700">${escHtml(inv.invoice_number)}</div>
            <div style="color:#6b7280;margin-top:4px">Created ${inv.created_at.slice(0,10)}</div>
          </div>
          <div style="text-align:right">${badge(inv.status)}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
          <div>
            <div class="meta-label">Bill To</div>
            <div class="meta-value" style="margin-top:6px">
              <strong>${escHtml(inv.customer_name)}</strong><br>
              ${escHtml(inv.customer_email)}
              ${inv.customer_phone ? `<br>${escHtml(inv.customer_phone)}` : ''}
              ${inv.customer_address ? `<br>${escHtml(inv.customer_address)}` : ''}
            </div>
          </div>
          <div>
            <div class="meta-label">Issue Date</div><div class="meta-value">${inv.issue_date}</div><br>
            <div class="meta-label">Due Date</div><div class="meta-value">${inv.due_date}</div>
          </div>
        </div>

        ${inv.notes ? `<div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:20px;color:#374151"><em>${escHtml(inv.notes)}</em></div>` : ''}

        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Line Items</h3>
        <div class="table-wrap card" style="margin-bottom:16px">
          <table>
            <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>
        <div style="text-align:right;margin-bottom:24px">
          <div class="total-row"><span>Subtotal</span><span>${fmt(inv.total)}</span></div>
          <div class="total-row"><span>Amount Paid</span><span style="color:#059669">${fmt(inv.amount_paid)}</span></div>
          <div class="total-row grand"><span>Balance Due</span><span>${fmt(inv.balance_due)}</span></div>
        </div>

        <h3 style="font-size:14px;font-weight:600;margin-bottom:10px">Payments</h3>
        <div class="table-wrap card">
          <table>
            <thead><tr><th>Date</th><th>Method</th><th style="text-align:right">Amount</th><th>Notes</th><th></th></tr></thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function sendInvoice(id) {
  try {
    await api('POST', `/invoices/${id}/send`);
    toast('Invoice marked as sent');
    loadInvoiceDetail(id);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteInvoice(id) {
  if (!confirm('Delete this invoice? This cannot be undone.')) return;
  try {
    await api('DELETE', `/invoices/${id}`);
    toast('Invoice deleted');
    loadInvoices();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ================================================================
   PAYMENT MODAL
================================================================ */
let _payInvoiceId = null;

function openPaymentModal(invoiceId, balanceDue) {
  _payInvoiceId = invoiceId;
  $('#pay-amount').value = balanceDue ? balanceDue.toFixed(2) : '';
  $('#pay-date').value = new Date().toISOString().slice(0, 10);
  $('#pay-method').value = 'bank_transfer';
  $('#pay-notes').value = '';
  $('#payment-modal').classList.remove('hidden');
}

$('#pay-cancel').addEventListener('click', () => {
  $('#payment-modal').classList.add('hidden');
});

$('#payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('POST', '/payments', {
      invoice_id:   _payInvoiceId,
      amount:       parseFloat($('#pay-amount').value),
      payment_date: $('#pay-date').value,
      method:       $('#pay-method').value,
      notes:        $('#pay-notes').value || undefined,
    });
    $('#payment-modal').classList.add('hidden');
    toast('Payment recorded');
    loadInvoiceDetail(_payInvoiceId);
  } catch (e) {
    toast(e.message, 'error');
  }
});

async function deletePayment(paymentId, invoiceId) {
  if (!confirm('Delete this payment record?')) return;
  try {
    await api('DELETE', `/payments/${paymentId}`);
    toast('Payment deleted');
    loadInvoiceDetail(invoiceId);
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ================================================================
   INVOICE FORM
================================================================ */
async function startNewInvoice() {
  showView('invoice-form');
  setTitle('New Invoice');
  $('#invoice-form-title').textContent = 'New Invoice';
  $('#invoice-form').reset();

  // Populate customers
  const customers = await api('GET', '/customers');
  const sel = $('#inv-customer');
  sel.innerHTML = `<option value="">— Select customer —</option>` +
    customers.map(c => `<option value="${escHtml(c.id)}">${escHtml(c.name)}</option>`).join('');

  // Set today's date / +30 days
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * MS_PER_DAY).toISOString().slice(0, 10);
  $('#inv-issue-date').value = today;
  $('#inv-due-date').value = due;

  // Reset line items
  $('#line-items-list').innerHTML = '';
  addLineItem();
  addLineItem();
  recalcTotals();
}

function addLineItem(desc = '', qty = 1, price = 0) {
  const div = document.createElement('div');
  div.className = 'line-item';
  div.innerHTML = `
    <input type="text" placeholder="Description" value="${escHtml(desc)}" class="li-desc" required />
    <input type="number" placeholder="Qty" value="${qty}" min="0.01" step="any" class="li-qty" required />
    <input type="number" placeholder="Unit Price" value="${price}" min="0" step="0.01" class="li-price" required />
    <button type="button" class="btn btn-icon" onclick="removeLineItem(this)" title="Remove item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;
  div.querySelectorAll('input').forEach(i => i.addEventListener('input', recalcTotals));
  $('#line-items-list').appendChild(div);
}

function removeLineItem(btn) {
  btn.closest('.line-item').remove();
  recalcTotals();
}

function recalcTotals() {
  let subtotal = 0;
  $$('.line-item').forEach(li => {
    const qty = parseFloat($('.li-qty', li).value) || 0;
    const price = parseFloat($('.li-price', li).value) || 0;
    subtotal += qty * price;
  });
  $('#inv-subtotal').textContent = fmt(subtotal);
  $('#inv-total').textContent = fmt(subtotal);
}

$('#add-item-btn').addEventListener('click', () => addLineItem());

$('#invoice-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const items = $$('.line-item').map(li => ({
    description: $('.li-desc', li).value,
    quantity:    parseFloat($('.li-qty', li).value),
    unit_price:  parseFloat($('.li-price', li).value),
  }));

  try {
    const inv = await api('POST', '/invoices', {
      customer_id: $('#inv-customer').value,
      issue_date:  $('#inv-issue-date').value,
      due_date:    $('#inv-due-date').value,
      notes:       $('#inv-notes').value || undefined,
      items,
    });
    toast(`Invoice ${inv.invoice_number} created`);
    loadInvoiceDetail(inv.id);
  } catch (e) {
    toast(e.message, 'error');
  }
});

$('#invoice-form-cancel').addEventListener('click', loadInvoices);

/* ================================================================
   CUSTOMERS
================================================================ */
async function loadCustomers() {
  showView('customers');
  setTitle('Customers', `<button class="btn btn-primary" onclick="startNewCustomer()">+ New Customer</button>`);

  try {
    const customers = await api('GET', '/customers');
    if (!customers.length) {
      $('#customers-table-wrap').innerHTML = emptyState('No customers yet. Click "New Customer" to add one.');
      return;
    }
    const rows = customers.map(c => `
      <tr>
        <td>${escHtml(c.name)}</td>
        <td>${escHtml(c.email)}</td>
        <td>${escHtml(c.phone || '—')}</td>
        <td>${escHtml(c.address || '—')}</td>
        <td><div class="table-actions">
          <button class="btn btn-secondary btn-sm" onclick="startEditCustomer('${c.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Delete</button>
        </div></td>
      </tr>`).join('');

    $('#customers-table-wrap').innerHTML = `
      <div class="card table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  } catch (e) {
    toast(e.message, 'error');
  }
}

let _editCustomerId = null;

function startNewCustomer() {
  _editCustomerId = null;
  showView('customer-form');
  setTitle('New Customer');
  $('#customer-form-title').textContent = 'New Customer';
  $('#customer-form').reset();
}

async function startEditCustomer(id) {
  _editCustomerId = id;
  try {
    const c = await api('GET', `/customers/${id}`);
    showView('customer-form');
    setTitle('Edit Customer');
    $('#customer-form-title').textContent = 'Edit Customer';
    $('#cust-name').value = c.name;
    $('#cust-email').value = c.email;
    $('#cust-phone').value = c.phone || '';
    $('#cust-address').value = c.address || '';
  } catch (e) {
    toast(e.message, 'error');
  }
}

$('#customer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name:    $('#cust-name').value,
    email:   $('#cust-email').value,
    phone:   $('#cust-phone').value || undefined,
    address: $('#cust-address').value || undefined,
  };
  try {
    if (_editCustomerId) {
      await api('PUT', `/customers/${_editCustomerId}`, body);
      toast('Customer updated');
    } else {
      await api('POST', '/customers', body);
      toast('Customer created');
    }
    loadCustomers();
  } catch (e) {
    toast(e.message, 'error');
  }
});

$('#customer-form-cancel').addEventListener('click', loadCustomers);

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  try {
    await api('DELETE', `/customers/${id}`);
    toast('Customer deleted');
    loadCustomers();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ================================================================
   Utility
================================================================ */
function emptyState(msg) {
  return `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
    <p>${escHtml(msg)}</p>
  </div>`;
}

/* ================================================================
   Navigation
================================================================ */
$$('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    if (view === 'dashboard') loadDashboard();
    else if (view === 'invoices') loadInvoices();
    else if (view === 'customers') loadCustomers();
  });
});

/* ================================================================
   Init
================================================================ */
loadDashboard();

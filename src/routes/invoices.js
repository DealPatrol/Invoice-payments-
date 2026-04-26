'use strict';

const { Router } = require('express');
const { randomUUID } = require('crypto');

/**
 * @param {import('better-sqlite3').Database} db
 */
function invoicesRouter(db) {
  const router = Router();

  // List all invoices (with customer name and totals)
  router.get('/', (req, res) => {
    const { status, customer_id } = req.query;
    let sql = `
      SELECT i.id, i.invoice_number, i.issue_date, i.due_date, i.status, i.notes,
             i.customer_id, c.name AS customer_name, c.email AS customer_email,
             COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS total,
             COALESCE(SUM(p.amount), 0)                    AS amount_paid
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN payments p ON p.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND i.customer_id = ?'; params.push(customer_id); }
    sql += ' GROUP BY i.id ORDER BY i.issue_date DESC';

    const invoices = db.prepare(sql).all(...params);
    res.json(invoices);
  });

  // Get a single invoice with its items and payments
  router.get('/:id', (req, res) => {
    const invoice = db
      .prepare(
        `SELECT i.*, c.name AS customer_name, c.email AS customer_email,
                c.phone AS customer_phone, c.address AS customer_address
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
         WHERE i.id = ?`
      )
      .get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    invoice.items = db
      .prepare(
        'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, rowid'
      )
      .all(req.params.id);

    invoice.payments = db
      .prepare(
        'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date'
      )
      .all(req.params.id);

    invoice.total = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    invoice.amount_paid = invoice.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    invoice.balance_due = invoice.total - invoice.amount_paid;

    res.json(invoice);
  });

  // Create an invoice with its line items
  router.post('/', (req, res) => {
    const { customer_id, issue_date, due_date, notes, items } = req.body || {};

    if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });
    if (!issue_date) return res.status(400).json({ error: 'issue_date is required' });
    if (!due_date) return res.status(400).json({ error: 'due_date is required' });

    const customer = db
      .prepare('SELECT id FROM customers WHERE id = ?')
      .get(customer_id);
    if (!customer) return res.status(400).json({ error: 'Customer not found' });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }
    for (const [i, item] of items.entries()) {
      if (!item.description || String(item.description).trim() === '') {
        return res.status(400).json({ error: `Item ${i + 1}: description is required` });
      }
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return res.status(400).json({ error: `Item ${i + 1}: quantity must be a positive number` });
      }
      if (!Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0) {
        return res.status(400).json({ error: `Item ${i + 1}: unit_price must be >= 0` });
      }
    }

    // Generate sequential invoice number
    const lastNum = db
      .prepare("SELECT invoice_number FROM invoices ORDER BY rowid DESC LIMIT 1")
      .get();
    let nextNum = 1;
    if (lastNum) {
      const match = String(lastNum.invoice_number).match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const invoice_number = `INV-${String(nextNum).padStart(4, '0')}`;

    const createInvoice = db.transaction(() => {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO invoices (id, invoice_number, customer_id, issue_date, due_date, status, notes)
         VALUES (?, ?, ?, ?, ?, 'draft', ?)`
      ).run(id, invoice_number, customer_id, issue_date, due_date, notes || null);

      const insertItem = db.prepare(
        `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      items.forEach((item, idx) => {
        insertItem.run(
          randomUUID(),
          id,
          String(item.description).trim(),
          Number(item.quantity),
          Number(item.unit_price),
          idx
        );
      });

      return id;
    });

    const id = createInvoice();

    // Return the full invoice details
    const invoice = db
      .prepare(
        `SELECT i.*, c.name AS customer_name, c.email AS customer_email
         FROM invoices i JOIN customers c ON c.id = i.customer_id
         WHERE i.id = ?`
      )
      .get(id);
    invoice.items = db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order')
      .all(id);

    res.status(201).json(invoice);
  });

  // Update invoice metadata (status, dates, notes) — NOT items
  router.put('/:id', (req, res) => {
    const invoice = db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const { issue_date, due_date, status, notes } = req.body || {};
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    db.prepare(
      `UPDATE invoices
       SET issue_date = COALESCE(?, issue_date),
           due_date   = COALESCE(?, due_date),
           status     = COALESCE(?, status),
           notes      = COALESCE(?, notes)
       WHERE id = ?`
    ).run(
      issue_date || null,
      due_date || null,
      status || null,
      notes !== undefined ? notes : null,
      req.params.id
    );

    const updated = db
      .prepare(
        `SELECT i.*, c.name AS customer_name
         FROM invoices i JOIN customers c ON c.id = i.customer_id
         WHERE i.id = ?`
      )
      .get(req.params.id);
    updated.items = db
      .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order')
      .all(req.params.id);

    res.json(updated);
  });

  // Mark invoice as sent
  router.post('/:id/send', (req, res) => {
    const invoice = db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') {
      return res.status(409).json({ error: 'Cannot send an already paid invoice' });
    }
    db.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Invoice marked as sent', invoice_id: req.params.id });
  });

  // Delete an invoice (only drafts or cancelled)
  router.delete('/:id', (req, res) => {
    const invoice = db
      .prepare('SELECT * FROM invoices WHERE id = ?')
      .get(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (!['draft', 'cancelled'].includes(invoice.status)) {
      return res
        .status(409)
        .json({ error: 'Only draft or cancelled invoices can be deleted' });
    }

    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
    res.json({ message: 'Invoice deleted' });
  });

  return router;
}

module.exports = { invoicesRouter };

'use strict';

const { Router } = require('express');
const { randomUUID } = require('crypto');

/**
 * @param {import('better-sqlite3').Database} db
 */
function paymentsRouter(db) {
  const router = Router();

  // List payments for an invoice
  router.get('/invoice/:invoiceId', (req, res) => {
    const invoice = db
      .prepare('SELECT id FROM invoices WHERE id = ?')
      .get(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const payments = db
      .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date')
      .all(req.params.invoiceId);
    res.json(payments);
  });

  // Record a payment against an invoice
  router.post('/', (req, res) => {
    const { invoice_id, amount, payment_date, method, notes } = req.body || {};

    if (!invoice_id) return res.status(400).json({ error: 'invoice_id is required' });
    if (!payment_date) return res.status(400).json({ error: 'payment_date is required' });

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const validMethods = ['cash', 'bank_transfer', 'credit_card', 'check', 'other'];
    const paymentMethod = method || 'bank_transfer';
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `method must be one of: ${validMethods.join(', ')}` });
    }

    const invoice = db
      .prepare(
        `SELECT i.*, COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS total
         FROM invoices i
         LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
         WHERE i.id = ?
         GROUP BY i.id`
      )
      .get(invoice_id);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'cancelled') {
      return res.status(409).json({ error: 'Cannot record payment for a cancelled invoice' });
    }

    // Check if this payment would exceed the invoice total
    const alreadyPaid = db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ?')
      .get(invoice_id).paid;
    const remaining = invoice.total - alreadyPaid;

    if (parsedAmount > remaining + 0.001) {
      return res.status(400).json({
        error: `Payment of ${parsedAmount} exceeds balance due of ${remaining.toFixed(2)}`
      });
    }

    const recordPayment = db.transaction(() => {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO payments (id, invoice_id, amount, payment_date, method, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, invoice_id, parsedAmount, payment_date, paymentMethod, notes || null);

      // Mark invoice as paid if balance is now 0
      const newPaid = alreadyPaid + parsedAmount;
      if (Math.abs(newPaid - invoice.total) < 0.001) {
        db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ?").run(invoice_id);
      } else if (invoice.status === 'draft') {
        // Partial payment moves draft to sent
        db.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").run(invoice_id);
      }

      return id;
    });

    const id = recordPayment();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    const updatedInvoice = db.prepare('SELECT status FROM invoices WHERE id = ?').get(invoice_id);

    res.status(201).json({ ...payment, invoice_status: updatedInvoice.status });
  });

  // Delete a payment (reverses it)
  router.delete('/:id', (req, res) => {
    const payment = db
      .prepare('SELECT * FROM payments WHERE id = ?')
      .get(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    db.transaction(() => {
      db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);

      // Recalculate invoice status after deletion
      const invoice = db
        .prepare(
          `SELECT i.status, COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS total
           FROM invoices i
           LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
           WHERE i.id = ?
           GROUP BY i.id`
        )
        .get(payment.invoice_id);

      if (invoice && invoice.status === 'paid') {
        const paidSoFar = db
          .prepare('SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ?')
          .get(payment.invoice_id).paid;
        if (paidSoFar < invoice.total - 0.001) {
          db.prepare("UPDATE invoices SET status = 'sent' WHERE id = ?").run(payment.invoice_id);
        }
      }
    })();

    res.json({ message: 'Payment deleted' });
  });

  return router;
}

module.exports = { paymentsRouter };

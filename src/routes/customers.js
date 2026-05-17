'use strict';

const { Router } = require('express');
const { randomUUID } = require('crypto');

/**
 * @param {import('better-sqlite3').Database} db
 */
function customersRouter(db) {
  const router = Router();

  // List all customers
  router.get('/', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
    res.json(customers);
  });

  // Get a single customer with their invoice summary
  router.get('/:id', (req, res) => {
    const customer = db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const invoices = db
      .prepare(
        `SELECT i.id, i.invoice_number, i.issue_date, i.due_date, i.status,
                COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS total
         FROM invoices i
         LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
         WHERE i.customer_id = ?
         GROUP BY i.id
         ORDER BY i.issue_date DESC`
      )
      .all(req.params.id);

    res.json({ ...customer, invoices });
  });

  // Create a customer
  router.post('/', (req, res) => {
    const { name, email, phone, address } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'email is required' });
    }

    const id = randomUUID();
    db.prepare(
      'INSERT INTO customers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name.trim(), email.trim(), phone || null, address || null);

    const customer = db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(id);
    res.status(201).json(customer);
  });

  // Update a customer
  router.put('/:id', (req, res) => {
    const existing = db
      .prepare('SELECT id FROM customers WHERE id = ?')
      .get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const { name, email, phone, address } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'email is required' });
    }

    db.prepare(
      'UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?'
    ).run(name.trim(), email.trim(), phone || null, address || null, req.params.id);

    const customer = db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(req.params.id);
    res.json(customer);
  });

  // Delete a customer (only if they have no invoices)
  router.delete('/:id', (req, res) => {
    const existing = db
      .prepare('SELECT id FROM customers WHERE id = ?')
      .get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const invoiceCount = db
      .prepare('SELECT COUNT(*) AS cnt FROM invoices WHERE customer_id = ?')
      .get(req.params.id).cnt;
    if (invoiceCount > 0) {
      return res
        .status(409)
        .json({ error: 'Cannot delete a customer with existing invoices' });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ message: 'Customer deleted' });
  });

  return router;
}

module.exports = { customersRouter };

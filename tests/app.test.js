'use strict';

const request = require('supertest');
const { createDb } = require('../src/db/database');
const { createApp } = require('../server');

let app;
let db;

beforeAll(() => {
  db = createDb(':memory:');
  app = createApp(db);
});

afterAll(() => {
  db.close();
});

/* ===== Customers ===== */
describe('Customers API', () => {
  let customerId;

  test('GET /api/customers returns empty array initially', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /api/customers creates a customer', async () => {
    const res = await request(app).post('/api/customers').send({
      name: 'Acme Corp',
      email: 'billing@acme.com',
      phone: '+1 555 0100',
      address: '123 Main St',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Acme Corp');
    expect(res.body.email).toBe('billing@acme.com');
    expect(res.body.id).toBeDefined();
    customerId = res.body.id;
  });

  test('POST /api/customers returns 400 if name is missing', async () => {
    const res = await request(app).post('/api/customers').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test('POST /api/customers returns 400 if email is missing', async () => {
    const res = await request(app).post('/api/customers').send({ name: 'Bob' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('GET /api/customers returns the new customer', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(customerId);
  });

  test('GET /api/customers/:id returns customer with invoices list', async () => {
    const res = await request(app).get(`/api/customers/${customerId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Acme Corp');
    expect(Array.isArray(res.body.invoices)).toBe(true);
  });

  test('GET /api/customers/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/customers/nonexistent');
    expect(res.status).toBe(404);
  });

  test('PUT /api/customers/:id updates the customer', async () => {
    const res = await request(app).put(`/api/customers/${customerId}`).send({
      name: 'Acme Corp Updated',
      email: 'new@acme.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Acme Corp Updated');
  });

  test('DELETE /api/customers/:id with no invoices succeeds', async () => {
    // Create a temporary customer
    const tmp = await request(app).post('/api/customers').send({ name: 'Temp', email: 't@t.com' });
    const tmpId = tmp.body.id;
    const del = await request(app).delete(`/api/customers/${tmpId}`);
    expect(del.status).toBe(200);
    const check = await request(app).get(`/api/customers/${tmpId}`);
    expect(check.status).toBe(404);
  });
});

/* ===== Invoices ===== */
describe('Invoices API', () => {
  let customerId;
  let invoiceId;

  beforeAll(async () => {
    const res = await request(app).post('/api/customers').send({
      name: 'Beta LLC',
      email: 'beta@beta.com',
    });
    customerId = res.body.id;
  });

  const validInvoice = () => ({
    customer_id: null, // will be filled in test
    issue_date: '2024-01-15',
    due_date: '2024-02-15',
    items: [
      { description: 'Web Design', quantity: 10, unit_price: 100 },
      { description: 'Hosting', quantity: 1, unit_price: 50 },
    ],
    notes: 'Thank you for your business',
  });

  test('GET /api/invoices returns empty array initially', async () => {
    const res = await request(app).get('/api/invoices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/invoices creates an invoice with items', async () => {
    const body = { ...validInvoice(), customer_id: customerId };
    const res = await request(app).post('/api/invoices').send(body);
    expect(res.status).toBe(201);
    expect(res.body.invoice_number).toMatch(/^INV-/);
    expect(res.body.status).toBe('draft');
    expect(res.body.items).toHaveLength(2);
    invoiceId = res.body.id;
  });

  test('POST /api/invoices returns 400 if customer_id is missing', async () => {
    const body = validInvoice();
    const res = await request(app).post('/api/invoices').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customer_id/i);
  });

  test('POST /api/invoices returns 400 if items is empty', async () => {
    const res = await request(app).post('/api/invoices').send({
      customer_id: customerId,
      issue_date: '2024-01-15',
      due_date: '2024-02-15',
      items: [],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/item/i);
  });

  test('POST /api/invoices returns 400 if item quantity is invalid', async () => {
    const res = await request(app).post('/api/invoices').send({
      customer_id: customerId,
      issue_date: '2024-01-15',
      due_date: '2024-02-15',
      items: [{ description: 'X', quantity: -1, unit_price: 10 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/quantity/i);
  });

  test('GET /api/invoices/:id returns full invoice detail', async () => {
    const res = await request(app).get(`/api/invoices/${invoiceId}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBeCloseTo(1050);
    expect(res.body.balance_due).toBeCloseTo(1050);
    expect(res.body.payments).toHaveLength(0);
  });

  test('GET /api/invoices/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/invoices/unknown');
    expect(res.status).toBe(404);
  });

  test('POST /api/invoices/:id/send marks invoice as sent', async () => {
    const res = await request(app).post(`/api/invoices/${invoiceId}/send`);
    expect(res.status).toBe(200);
    const inv = await request(app).get(`/api/invoices/${invoiceId}`);
    expect(inv.body.status).toBe('sent');
  });

  test('PUT /api/invoices/:id updates status', async () => {
    const res = await request(app).put(`/api/invoices/${invoiceId}`).send({ status: 'overdue' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('overdue');
  });

  test('PUT /api/invoices/:id returns 400 for invalid status', async () => {
    const res = await request(app).put(`/api/invoices/${invoiceId}`).send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/invoices/:id returns 409 for non-draft invoices', async () => {
    const res = await request(app).delete(`/api/invoices/${invoiceId}`);
    expect(res.status).toBe(409);
  });

  test('DELETE /api/invoices/:id deletes a draft invoice', async () => {
    const body = { ...validInvoice(), customer_id: customerId };
    const created = await request(app).post('/api/invoices').send(body);
    const draftId = created.body.id;
    const del = await request(app).delete(`/api/invoices/${draftId}`);
    expect(del.status).toBe(200);
    const check = await request(app).get(`/api/invoices/${draftId}`);
    expect(check.status).toBe(404);
  });

  test('Invoice numbers are sequential (INV-0001, INV-0002, …)', async () => {
    const a = await request(app).post('/api/invoices').send({ ...validInvoice(), customer_id: customerId });
    const b = await request(app).post('/api/invoices').send({ ...validInvoice(), customer_id: customerId });
    const numA = parseInt(a.body.invoice_number.replace('INV-', ''), 10);
    const numB = parseInt(b.body.invoice_number.replace('INV-', ''), 10);
    expect(numB).toBe(numA + 1);
  });
});

/* ===== Payments ===== */
describe('Payments API', () => {
  let customerId;
  let invoiceId;
  let paymentId;

  beforeAll(async () => {
    const c = await request(app).post('/api/customers').send({ name: 'Pay Co', email: 'pay@co.com' });
    customerId = c.body.id;
    const inv = await request(app).post('/api/invoices').send({
      customer_id: customerId,
      issue_date: '2024-03-01',
      due_date: '2024-04-01',
      items: [{ description: 'Service', quantity: 2, unit_price: 500 }],
    });
    invoiceId = inv.body.id;
    // Mark as sent so payments can be recorded
    await request(app).post(`/api/invoices/${invoiceId}/send`);
  });

  test('GET /api/payments/invoice/:id returns empty array initially', async () => {
    const res = await request(app).get(`/api/payments/invoice/${invoiceId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('POST /api/payments records a partial payment', async () => {
    const res = await request(app).post('/api/payments').send({
      invoice_id: invoiceId,
      amount: 600,
      payment_date: '2024-03-15',
      method: 'bank_transfer',
    });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(600);
    expect(res.body.invoice_status).toBe('sent'); // partial — not fully paid
    paymentId = res.body.id;
  });

  test('POST /api/payments returns 400 if amount exceeds balance', async () => {
    const res = await request(app).post('/api/payments').send({
      invoice_id: invoiceId,
      amount: 9999,
      payment_date: '2024-03-16',
      method: 'cash',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/balance/i);
  });

  test('POST /api/payments marks invoice as paid when balance reaches zero', async () => {
    const res = await request(app).post('/api/payments').send({
      invoice_id: invoiceId,
      amount: 400,
      payment_date: '2024-03-20',
      method: 'cash',
    });
    expect(res.status).toBe(201);
    expect(res.body.invoice_status).toBe('paid');
  });

  test('POST /api/payments returns 400 if amount is invalid', async () => {
    const res = await request(app).post('/api/payments').send({
      invoice_id: invoiceId,
      amount: -50,
      payment_date: '2024-03-21',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });

  test('POST /api/payments returns 400 if payment_date is missing', async () => {
    const res = await request(app).post('/api/payments').send({
      invoice_id: invoiceId,
      amount: 10,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/payment_date/i);
  });

  test('POST /api/payments returns 400 for invalid method', async () => {
    const res = await request(app).post('/api/payments').send({
      invoice_id: invoiceId,
      amount: 10,
      payment_date: '2024-03-22',
      method: 'bitcoin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/method/i);
  });

  test('DELETE /api/payments/:id deletes a payment and reverts status', async () => {
    const del = await request(app).delete(`/api/payments/${paymentId}`);
    expect(del.status).toBe(200);
    const inv = await request(app).get(`/api/invoices/${invoiceId}`);
    // After deleting the $600 partial payment, total paid is now $400 < $1000 → sent
    expect(inv.body.status).toBe('sent');
  });

  test('DELETE /api/payments/:id returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/payments/doesnotexist');
    expect(res.status).toBe(404);
  });

  test('DELETE customer with invoices returns 409', async () => {
    const res = await request(app).delete(`/api/customers/${customerId}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/invoices/i);
  });
});

/* ===== Health check ===== */
describe('Health check', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

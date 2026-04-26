'use strict';

const express = require('express');
const path = require('path');
const { createDb } = require('./src/db/database');
const { customersRouter } = require('./src/routes/customers');
const { invoicesRouter } = require('./src/routes/invoices');
const { paymentsRouter } = require('./src/routes/payments');

/**
 * Creates and configures the Express application.
 * @param {import('better-sqlite3').Database} [db] - Optional database instance (used for testing).
 * @returns {express.Application}
 */
function createApp(db) {
  const database = db || createDb();
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // API routes
  app.use('/api/customers', customersRouter(database));
  app.use('/api/invoices', invoicesRouter(database));
  app.use('/api/payments', paymentsRouter(database));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // SPA fallback – serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

module.exports = { createApp };

// Start the server when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Invoice app running at http://localhost:${PORT}`);
  });
}

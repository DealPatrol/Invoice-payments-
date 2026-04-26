'use strict';

const Database = require('better-sqlite3');
const path = require('path');

/**
 * Opens (or creates) the SQLite database and ensures all tables exist.
 * @param {string} [dbPath] - Optional path for the database file.
 *                            Defaults to invoice.db in the project root.
 *                            Pass ':memory:' for in-memory databases (tests).
 * @returns {import('better-sqlite3').Database}
 */
function createDb(dbPath) {
  const filePath = dbPath || path.join(__dirname, '..', '..', 'invoice.db');
  const db = new Database(filePath);

  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT,
      address     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id             TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id    TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      issue_date     TEXT NOT NULL,
      due_date       TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'draft'
                       CHECK(status IN ('draft','sent','paid','overdue','cancelled')),
      notes          TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id          TEXT PRIMARY KEY,
      invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity    REAL NOT NULL CHECK(quantity > 0),
      unit_price  REAL NOT NULL CHECK(unit_price >= 0),
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      id           TEXT PRIMARY KEY,
      invoice_id   TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount       REAL NOT NULL CHECK(amount > 0),
      payment_date TEXT NOT NULL,
      method       TEXT NOT NULL DEFAULT 'bank_transfer'
                     CHECK(method IN ('cash','bank_transfer','credit_card','check','other')),
      notes        TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

module.exports = { createDb };

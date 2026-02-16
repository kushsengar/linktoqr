/**
 * lib/db.js — Turso (Cloud SQLite) Database Layer
 * 
 * LEARNING:
 * ─────────
 * We're using Turso — a cloud-hosted SQLite database.
 * Same SQL you already know, but it lives in the cloud instead of a local file.
 * 
 * Key difference from better-sqlite3:
 * - better-sqlite3 is SYNCHRONOUS: const row = stmt.get(email)
 * - @libsql/client is ASYNC: const result = await client.execute(...)
 * 
 * Why async? Because the database is on another server now.
 * Network calls are always async in JavaScript.
 */

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data/linktoqr.db',   // Falls back to local file for dev
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create tables on first run
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    user_id INTEGER,
    scan_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    expires_at DATETIME,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ── Helper Functions ─────────────────────────────
// These wrap raw SQL into clean async functions.
// Each matches what the old better-sqlite3 prepared statements did.

export async function createUser(email, hashedPassword) {
  const result = await db.execute({
    sql: 'INSERT INTO users (email, password) VALUES (?, ?)',
    args: [email, hashedPassword]
  });
  return { lastInsertRowid: Number(result.lastInsertRowid) };
}

export async function findUserByEmail(email) {
  const result = await db.execute({
    sql: 'SELECT id, email, password, plan FROM users WHERE email = ?',
    args: [email]
  });
  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await db.execute({
    sql: 'SELECT id, email, plan FROM users WHERE id = ?',
    args: [id]
  });
  return result.rows[0] || null;
}

export async function createQR(shortCode, url, userId, expiresAt, password) {
  await db.execute({
    sql: 'INSERT INTO qr_codes (short_code, destination_url, user_id, expires_at, password) VALUES (?, ?, ?, ?, ?)',
    args: [shortCode, url, userId, expiresAt, password]
  });
}

export async function findByCode(code) {
  const result = await db.execute({
    sql: 'SELECT * FROM qr_codes WHERE short_code = ? AND is_active = 1',
    args: [code]
  });
  return result.rows[0] || null;
}

export async function incrementScan(code) {
  await db.execute({
    sql: 'UPDATE qr_codes SET scan_count = scan_count + 1 WHERE short_code = ?',
    args: [code]
  });
}

export async function getStats(code) {
  const result = await db.execute({
    sql: 'SELECT short_code, destination_url, scan_count, created_at, expires_at FROM qr_codes WHERE short_code = ?',
    args: [code]
  });
  return result.rows[0] || null;
}

export async function getUserQRs(userId) {
  const result = await db.execute({
    sql: 'SELECT short_code, destination_url, scan_count, created_at, expires_at FROM qr_codes WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    args: [userId]
  });
  return result.rows;
}

export async function countUserQRs(userId) {
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM qr_codes WHERE user_id = ? AND is_active = 1',
    args: [userId]
  });
  return Number(result.rows[0].count);
}

export async function updateDestination(url, code, userId) {
  const result = await db.execute({
    sql: 'UPDATE qr_codes SET destination_url = ? WHERE short_code = ? AND user_id = ?',
    args: [url, code, userId]
  });
  return { changes: result.rowsAffected };
}

export async function deleteQR(code, userId) {
  const result = await db.execute({
    sql: 'UPDATE qr_codes SET is_active = 0 WHERE short_code = ? AND user_id = ?',
    args: [code, userId]
  });
  return { changes: result.rowsAffected };
}

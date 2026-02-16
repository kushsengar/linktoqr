/**
 * ============================================
 *  db.js — Database Layer (SQLite)
 * ============================================
 * 
 * WHY SQLite?
 * -----------
 * - Zero setup: no external database server needed
 * - Single file: entire DB lives in ./data/linktoqr.db
 * - Fast: handles thousands of reads/writes per second
 * - Perfect for early-stage SaaS (switch to PostgreSQL when you scale)
 * 
 * LIBRARY: better-sqlite3
 * - Synchronous API (simpler than async alternatives)
 * - 10x faster than node-sqlite3 for most operations
 * 
 * LEARNING POINTS:
 * 1. Prepared statements prevent SQL injection attacks
 * 2. WAL mode improves concurrent read performance
 * 3. Migrations: in production, use a migration tool (knex, prisma)
 *    For now, we create tables on startup if they don't exist.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Open (or create) the database file
const db = new Database(path.join(dataDir, 'linktoqr.db'));

// ─── Performance: enable WAL mode ───
// WAL = Write-Ahead Logging
// Allows multiple readers while one writer is active
// Huge performance boost for web apps
db.pragma('journal_mode = WAL');

// ─── Create tables if they don't exist ───

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        plan        TEXT DEFAULT 'free',
        created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        short_code      TEXT UNIQUE NOT NULL,
        destination_url TEXT NOT NULL,
        user_id         INTEGER,
        scan_count      INTEGER DEFAULT 0,
        created_at      TEXT DEFAULT (datetime('now')),
        last_scanned_at TEXT,
        expires_at      TEXT,
        password        TEXT,
        is_active       INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_short_code ON qr_codes(short_code);
    CREATE INDEX IF NOT EXISTS idx_user_id ON qr_codes(user_id);
`);

// ─── Prepared Statements ───
// Pre-compiled SQL = faster execution + SQL injection protection

const stmts = {
    // QR Codes
    createQR: db.prepare(`
        INSERT INTO qr_codes (short_code, destination_url, user_id, expires_at, password)
        VALUES (?, ?, ?, ?, ?)
    `),

    findByCode: db.prepare(`
        SELECT * FROM qr_codes WHERE short_code = ? AND is_active = 1
    `),

    incrementScan: db.prepare(`
        UPDATE qr_codes 
        SET scan_count = scan_count + 1, last_scanned_at = datetime('now')
        WHERE short_code = ?
    `),

    getStats: db.prepare(`
        SELECT short_code, destination_url, scan_count, created_at, last_scanned_at, expires_at, is_active
        FROM qr_codes WHERE short_code = ?
    `),

    getUserQRs: db.prepare(`
        SELECT short_code, destination_url, scan_count, created_at, last_scanned_at, expires_at, is_active
        FROM qr_codes WHERE user_id = ? ORDER BY created_at DESC
    `),

    countUserQRs: db.prepare(`
        SELECT COUNT(*) as count FROM qr_codes WHERE user_id = ?
    `),

    updateDestination: db.prepare(`
        UPDATE qr_codes SET destination_url = ? WHERE short_code = ? AND user_id = ?
    `),

    deleteQR: db.prepare(`
        UPDATE qr_codes SET is_active = 0 WHERE short_code = ? AND user_id = ?
    `),

    // Users
    createUser: db.prepare(`
        INSERT INTO users (email, password) VALUES (?, ?)
    `),

    findUserByEmail: db.prepare(`
        SELECT * FROM users WHERE email = ?
    `),

    findUserById: db.prepare(`
        SELECT id, email, plan, created_at FROM users WHERE id = ?
    `),
};

module.exports = { db, stmts };

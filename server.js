/**
 * ============================================
 *  server.js — Express API Server
 * ============================================
 * 
 * LEARNING POINTS:
 * ────────────────
 * 1. EXPRESS MIDDLEWARE: Functions that run BEFORE your route handlers.
 *    Think of it as a pipeline: Request → Middleware1 → Middleware2 → Route Handler → Response
 * 
 * 2. REST API DESIGN:
 *    POST   /api/qr          → Create a resource (new QR code)
 *    GET    /api/qr/:code     → Read a resource (QR stats)
 *    PUT    /api/qr/:code     → Update a resource (change destination)
 *    DELETE /api/qr/:code     → Delete a resource
 *    GET    /r/:code          → Redirect (this is the public-facing short URL)
 * 
 * 3. SEPARATION OF CONCERNS:
 *    - server.js  → HTTP handling, routing
 *    - db.js      → Data access
 *    - auth middleware → Authentication
 *    Each file has ONE job.
 * 
 * 4. RATE LIMITING: Prevents abuse. Without it, someone could
 *    create millions of QR codes and crash your server.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Generate a short random code (replaces nanoid — zero extra dependencies)
function nanoid(size = 8) {
    return crypto.randomBytes(size).toString('base64url').slice(0, size);
}
const { stmts } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// ─────────────────────────────────────────────
//  MIDDLEWARE (runs on every request)
// ─────────────────────────────────────────────

// Parse JSON request bodies
// Without this, req.body would be undefined
app.use(express.json());

// CORS — Cross-Origin Resource Sharing
// Allows your frontend (on a different port/domain) to call the API
// In production, restrict this to your actual domain
app.use(cors());

// Serve static files (your frontend: index.html, style.css, app.js)
// Express automatically looks for index.html when you visit "/"
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting — protects against abuse
// Window: 1 minute, Max: 60 requests per IP
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 60,
    message: { error: 'Too many requests. Please try again in a minute.' },
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false,
});

// Apply rate limit to API routes only
app.use('/api/', apiLimiter);

// Security headers — simple but effective protection
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');     // Prevents MIME type sniffing
    res.setHeader('X-Frame-Options', 'DENY');                // Prevents clickjacking
    res.setHeader('X-XSS-Protection', '1; mode=block');      // XSS filter
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});


// ─────────────────────────────────────────────
//  AUTH MIDDLEWARE
// ─────────────────────────────────────────────
//  This function checks if the request has a valid JWT token.
//  Used on protected routes (creating QR, viewing dashboard, etc.)

function authRequired(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next(); // Continue to route handler
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Optional auth — attaches user if token exists, but doesn't block
function authOptional(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            // Invalid token — just continue without user
        }
    }
    next();
}


// ─────────────────────────────────────────────
//  PLAN LIMITS
// ─────────────────────────────────────────────

const PLAN_LIMITS = {
    free: 2,
    pro: 50,
    business: Infinity,
};


// ─────────────────────────────────────────────
//  AUTH ROUTES
// ─────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Creates a new user account.
 * 
 * LEARNING: bcrypt.hashSync(password, 10)
 * - The "10" is the salt rounds (cost factor)
 * - Higher = more secure but slower
 * - 10 is the standard for web apps
 */
app.post('/api/auth/signup', (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existing = stmts.findUserByEmail.get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password (NEVER store plain text passwords!)
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Create user
        const result = stmts.createUser.run(email, hashedPassword);

        // Generate JWT token
        const token = jwt.sign(
            { id: result.lastInsertRowid, email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Account created',
            token,
            user: { id: result.lastInsertRowid, email, plan: 'free' }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * POST /api/auth/login
 * 
 * LEARNING: bcrypt.compareSync(plaintext, hash)
 * - Compares the password the user typed with the stored hash
 * - Timing-safe: prevents timing attacks
 */
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = stmts.findUserByEmail.get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, plan: user.plan }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Returns current user info (protected route)
 */
app.get('/api/auth/me', authRequired, (req, res) => {
    const user = stmts.findUserById.get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});


// ─────────────────────────────────────────────
//  QR CODE ROUTES
// ─────────────────────────────────────────────

/**
 * POST /api/qr — Create a new dynamic QR code
 * 
 * LEARNING: nanoid(8) generates a random 8-character string
 * like "V1StGXR8" — used as the short code in the redirect URL.
 * 8 chars = 2.8 trillion possible codes. That's enough.
 */
app.post('/api/qr', authOptional, (req, res) => {
    try {
        const { url, expiresAt, password } = req.body;

        // Validate URL
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'URL is required' });
        }

        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
            }
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        if (url.length > 2048) {
            return res.status(400).json({ error: 'URL too long (max 2048 chars)' });
        }

        // Check plan limits for authenticated users
        const userId = req.user ? req.user.id : null;
        if (userId) {
            const user = stmts.findUserById.get(userId);
            const count = stmts.countUserQRs.get(userId).count;
            const limit = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

            if (count >= limit) {
                return res.status(403).json({
                    error: `Free plan limit reached (${limit} QR codes). Upgrade to Pro for more.`,
                    upgrade: true
                });
            }
        }

        // Generate unique short code
        const shortCode = nanoid(8);

        // Hash password if provided (for password-protected QR)
        const hashedPw = password ? bcrypt.hashSync(password, 10) : null;

        // Insert into database
        stmts.createQR.run(shortCode, url, userId, expiresAt || null, hashedPw);

        // Return the result
        res.status(201).json({
            shortCode,
            shortUrl: `${BASE_URL}/r/${shortCode}`,
            destinationUrl: url,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Create QR error:', err);
        res.status(500).json({ error: 'Failed to create QR code' });
    }
});

/**
 * GET /r/:code — The redirect endpoint (PUBLIC)
 * 
 * This is the URL that gets encoded into the QR code.
 * When someone scans the QR → their phone opens this URL →
 * the server looks up the destination → redirects them there.
 * 
 * LEARNING: HTTP 302 = "Found" (temporary redirect)
 * - Browsers will always re-check the server
 * - This allows us to change the destination later
 * - HTTP 301 (permanent) would be cached by browsers — bad for dynamic QR
 */
app.get('/r/:code', (req, res) => {
    try {
        const qr = stmts.findByCode.get(req.params.code);

        if (!qr) {
            return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        }

        // Check expiration
        if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
            return res.status(410).json({ error: 'This QR code has expired' });
        }

        // Check password protection
        if (qr.password) {
            const providedPw = req.query.pw;
            if (!providedPw || !bcrypt.compareSync(providedPw, qr.password)) {
                return res.sendFile(path.join(__dirname, 'public', 'password.html'));
            }
        }

        // Track the scan (increment counter)
        stmts.incrementScan.run(req.params.code);

        // 302 redirect to the actual destination
        res.redirect(302, qr.destination_url);
    } catch (err) {
        console.error('Redirect error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/qr/:code/stats — Get QR code analytics
 */
app.get('/api/qr/:code/stats', (req, res) => {
    const stats = stmts.getStats.get(req.params.code);
    if (!stats) {
        return res.status(404).json({ error: 'QR code not found' });
    }
    res.json(stats);
});

/**
 * GET /api/qr/my — Get all QR codes for the logged-in user
 */
app.get('/api/qr/my', authRequired, (req, res) => {
    const qrs = stmts.getUserQRs.all(req.user.id);
    const count = stmts.countUserQRs.get(req.user.id).count;
    const user = stmts.findUserById.get(req.user.id);
    const limit = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

    res.json({
        qrCodes: qrs,
        usage: { count, limit: limit === Infinity ? 'unlimited' : limit },
        plan: user.plan
    });
});

/**
 * PUT /api/qr/:code — Update destination URL (protected)
 * 
 * This is the KILLER feature of dynamic QR.
 * Imagine: a restaurant prints QR codes on menus.
 * They can change the destination from old-menu.pdf to new-menu.pdf
 * WITHOUT reprinting a single QR code.
 */
app.put('/api/qr/:code', authRequired, (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'New URL is required' });
        }

        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const result = stmts.updateDestination.run(url, req.params.code, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'QR code not found or not owned by you' });
        }

        res.json({ message: 'Destination updated', shortCode: req.params.code, newUrl: url });
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ error: 'Failed to update' });
    }
});

/**
 * DELETE /api/qr/:code — Deactivate a QR code (protected)
 * 
 * LEARNING: We don't actually delete the row (soft delete).
 * We set is_active = 0. This preserves analytics data
 * and prevents the short code from being reused.
 */
app.delete('/api/qr/:code', authRequired, (req, res) => {
    const result = stmts.deleteQR.run(req.params.code, req.user.id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'QR code not found or not owned by you' });
    }

    res.json({ message: 'QR code deactivated' });
});


// ─────────────────────────────────────────────
//  CATCH-ALL: serve frontend for any other route
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║           LinkToQR Server                ║
║──────────────────────────────────────────║
║  🌐  http://localhost:${PORT}              ║
║  📊  API: /api/qr                        ║
║  🔗  Redirects: /r/:code                 ║
╚══════════════════════════════════════════╝
    `);
});

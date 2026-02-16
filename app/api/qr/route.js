/**
 * QR Code API Routes
 * POST /api/qr — Create a new dynamic QR code
 * GET  /api/qr — Get all QR codes for logged-in user
 */

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createQR, findUserById, countUserQRs, getUserQRs } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

function nanoid(size = 8) {
    return crypto.randomBytes(size).toString('base64url').slice(0, size);
}

const PLAN_LIMITS = { free: 2, pro: 50, business: Infinity };

export async function POST(request) {
    try {
        const { url, expiresAt, password } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return NextResponse.json({ error: 'Only HTTP/HTTPS URLs allowed' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        if (url.length > 2048) {
            return NextResponse.json({ error: 'URL too long (max 2048)' }, { status: 400 });
        }

        const authUser = getAuthUser();
        const userId = authUser ? authUser.id : null;

        if (userId) {
            const user = await findUserById(userId);
            const count = await countUserQRs(userId);
            const limit = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

            if (count >= limit) {
                return NextResponse.json({
                    error: `Plan limit reached (${limit} QR codes). Upgrade for more.`,
                    upgrade: true
                }, { status: 403 });
            }
        }

        const shortCode = nanoid(8);
        const hashedPw = password ? bcrypt.hashSync(password, 10) : null;

        await createQR(shortCode, url, userId, expiresAt || null, hashedPw);

        const origin = request.headers.get('origin') || request.headers.get('host') || 'localhost:3000';
        const protocol = origin.includes('localhost') ? 'http' : 'https';
        const baseUrl = origin.startsWith('http') ? origin : `${protocol}://${origin}`;

        return NextResponse.json({
            shortCode,
            shortUrl: `${baseUrl}/r/${shortCode}`,
            destinationUrl: url,
            createdAt: new Date().toISOString()
        }, { status: 201 });
    } catch (err) {
        console.error('Create QR error:', err);
        return NextResponse.json({ error: 'Failed to create QR code' }, { status: 500 });
    }
}

export async function GET() {
    const authUser = getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const qrs = await getUserQRs(authUser.id);
    const count = await countUserQRs(authUser.id);
    const user = await findUserById(authUser.id);
    const limit = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;

    return NextResponse.json({
        qrCodes: qrs,
        usage: { count, limit: limit === Infinity ? 'unlimited' : limit },
        plan: user.plan
    });
}

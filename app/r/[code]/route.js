/**
 * GET /r/[code] — Redirect handler
 * Scans hit this URL → we track the scan → redirect to destination
 */

import { NextResponse } from 'next/server';
import { findByCode, incrementScan } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request, { params }) {
    try {
        const qr = await findByCode(params.code);

        if (!qr) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // Check expiration
        if (qr.expires_at && new Date(qr.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This QR code has expired' }, { status: 410 });
        }

        // Check password protection
        if (qr.password) {
            const url = new URL(request.url);
            const providedPw = url.searchParams.get('pw');
            if (!providedPw || !bcrypt.compareSync(providedPw, qr.password)) {
                return NextResponse.redirect(new URL(`/password/${params.code}`, request.url));
            }
        }

        // Track the scan
        await incrementScan(params.code);

        // 302 temporary redirect
        return NextResponse.redirect(qr.destination_url, 302);
    } catch (err) {
        console.error('Redirect error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

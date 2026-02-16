/**
 * /api/qr/[code] — Edit, delete, and get stats for a QR code
 */

import { NextResponse } from 'next/server';
import { updateDestination, deleteQR, getStats } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PUT(request, { params }) {
    const authUser = getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: 'New URL is required' }, { status: 400 });

        try { new URL(url); } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        const result = await updateDestination(url, params.code, authUser.id);
        if (result.changes === 0) {
            return NextResponse.json({ error: 'QR code not found or not owned by you' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Destination updated', shortCode: params.code, newUrl: url });
    } catch (err) {
        console.error('Update error:', err);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const authUser = getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await deleteQR(params.code, authUser.id);
    if (result.changes === 0) {
        return NextResponse.json({ error: 'QR code not found or not owned by you' }, { status: 404 });
    }

    return NextResponse.json({ message: 'QR code deactivated' });
}

export async function GET(request, { params }) {
    const stats = await getStats(params.code);
    if (!stats) {
        return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }
    return NextResponse.json(stats);
}

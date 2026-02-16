import { NextResponse } from 'next/server';
import { findUserById } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    const authUser = getAuthUser();
    if (!authUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await findUserById(authUser.id);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
}

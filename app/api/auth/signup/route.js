import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail, createUser } from '@/lib/db';
import { createToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const existing = await findUserByEmail(email);
        if (existing) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = await createUser(email, hashedPassword);
        const token = createToken({ id: result.lastInsertRowid, email });

        return NextResponse.json({
            message: 'Account created',
            token,
            user: { id: result.lastInsertRowid, email, plan: 'free' }
        }, { status: 201 });
    } catch (err) {
        console.error('Signup error:', err);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
}

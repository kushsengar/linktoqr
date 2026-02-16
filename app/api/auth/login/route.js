import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/db';
import { createToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = createToken(user);

        return NextResponse.json({
            token,
            user: { id: user.id, email: user.email, plan: user.plan }
        });
    } catch (err) {
        console.error('Login error:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}

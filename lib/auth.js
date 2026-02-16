/**
 * lib/auth.js — JWT Authentication Helpers
 */

import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * Verifies the JWT token from the Authorization header.
 * Returns the decoded user payload or null.
 */
export function getAuthUser() {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.split(' ')[1];
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

/**
 * Creates a JWT token for a user.
 */
export function createToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

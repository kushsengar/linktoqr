'use client';

/**
 * app/password/[code]/page.js — Password Prompt Page
 * Shown when someone scans a password-protected QR code
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PasswordPage() {
    const { code } = useParams();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    function handleSubmit(e) {
        e.preventDefault();
        // Redirect to the actual QR redirect URL with password
        window.location.href = `/r/${code}?pw=${encodeURIComponent(password)}`;
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔒</div>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Protected QR Code</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>Enter the password to access this link.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', marginBottom: '14px', paddingLeft: '14px' }}
                    />
                    {error && <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</p>}
                    <button type="submit" className="generate-btn">
                        <span>Unlock</span>
                    </button>
                </form>
                <p style={{ marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Powered by <a href="/">LinkToQR</a>
                </p>
            </div>
        </div>
    );
}

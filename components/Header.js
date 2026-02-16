'use client';

/**
 * components/Header.js — Navigation with auth
 * 
 * LEARNING: This is a "client component" because it uses browser APIs
 * (localStorage for JWT token). Server components can't access localStorage.
 */

import { useState, useEffect } from 'react';

export default function Header() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('linktoqr_token');
        if (token) checkAuth(token);
    }, []);

    async function checkAuth(token) {
        try {
            const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
            if (res.ok) setLoggedIn(true);
            else { localStorage.removeItem('linktoqr_token'); setLoggedIn(false); }
        } catch { setLoggedIn(false); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            localStorage.setItem('linktoqr_token', data.token);
            setLoggedIn(true);
            setShowModal(false);
            setEmail(''); setPassword('');
        } catch (err) {
            setError(err.message);
        }
    }

    function logout() {
        localStorage.removeItem('linktoqr_token');
        setLoggedIn(false);
    }

    return (
        <>
            <nav className="nav-bar">
                <a href="/" className="logo">
                    <div className="logo-icon">
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" />
                            <rect x="20" y="2" width="10" height="10" rx="2" fill="currentColor" />
                            <rect x="2" y="20" width="10" height="10" rx="2" fill="currentColor" />
                            <rect x="14" y="14" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
                            <rect x="22" y="22" width="4" height="4" rx="1" fill="currentColor" opacity="0.6" />
                        </svg>
                    </div>
                    <span className="logo-text">LinkToQR</span>
                </a>
                <div className="nav-actions">
                    {loggedIn ? (
                        <>
                            <a href="/dashboard" className="nav-btn">My QR Codes</a>
                            <button className="nav-btn" onClick={logout}>Log out</button>
                        </>
                    ) : (
                        <>
                            <button className="nav-btn" onClick={() => { setAuthMode('login'); setShowModal(true); }}>Log in</button>
                            <button className="nav-btn nav-btn-primary" onClick={() => { setAuthMode('signup'); setShowModal(true); }}>Sign up free</button>
                        </>
                    )}
                </div>
            </nav>

            {/* Auth Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setShowModal(false)}>
                    <div className="modal">
                        <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        <h2>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
                            </div>
                            {error && <p style={{ color: 'var(--error)', fontSize: '0.82rem', marginBottom: '12px' }}>{error}</p>}
                            <button type="submit" className="generate-btn">
                                <span>{authMode === 'login' ? 'Log in' : 'Sign up'}</span>
                            </button>
                            <p className="auth-switch">
                                {authMode === 'login' ? (
                                    <>No account? <a onClick={() => setAuthMode('signup')}>Sign up free</a></>
                                ) : (
                                    <>Already have an account? <a onClick={() => setAuthMode('login')}>Log in</a></>
                                )}
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

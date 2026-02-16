'use client';

/**
 * app/dashboard/page.js — User Dashboard
 * 
 * LEARNING: This is a full page (not a modal) for managing QR codes.
 * Having it as a separate route (/dashboard) is better UX and SEO.
 */

import { useState, useEffect } from 'react';
import Header from '@/components/Header';

export default function DashboardPage() {
    const [qrCodes, setQrCodes] = useState([]);
    const [usage, setUsage] = useState({ count: 0, limit: 0 });
    const [plan, setPlan] = useState('free');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const token = localStorage.getItem('linktoqr_token');
        if (!token) { setError('Please log in to view your dashboard.'); setLoading(false); return; }

        try {
            const res = await fetch('/api/qr', {
                headers: { Authorization: 'Bearer ' + token }
            });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setQrCodes(data.qrCodes);
            setUsage(data.usage);
            setPlan(data.plan);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }

    async function editQR(code) {
        const newUrl = prompt('Enter new destination URL:');
        if (!newUrl) return;
        try { new URL(newUrl); } catch { alert('Invalid URL'); return; }

        const token = localStorage.getItem('linktoqr_token');
        const res = await fetch(`/api/qr/${code}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ url: newUrl })
        });
        if (res.ok) loadData();
        else alert('Failed to update');
    }

    async function deleteQR(code) {
        if (!confirm('Deactivate this QR code?')) return;
        const token = localStorage.getItem('linktoqr_token');
        const res = await fetch(`/api/qr/${code}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res.ok) loadData();
        else alert('Failed to delete');
    }

    return (
        <>
            <div className="bg-orbs" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <main className="container">
                <Header />

                <div className="card dashboard-card">
                    <div className="dashboard-header">
                        <h2>📊 My QR Codes</h2>
                        <div className="usage-badge">{usage.count} / {usage.limit} QR used ({plan})</div>
                    </div>

                    {loading ? (
                        <p className="empty-dashboard">Loading...</p>
                    ) : error ? (
                        <p className="empty-dashboard">{error}</p>
                    ) : qrCodes.length === 0 ? (
                        <p className="empty-dashboard">No dynamic QR codes yet. <a href="/" style={{ color: 'var(--accent-hover)' }}>Create one!</a></p>
                    ) : (
                        <div className="dashboard-list">
                            {qrCodes.map(qr => (
                                <div key={qr.short_code} className="qr-row">
                                    <div className="qr-row-info">
                                        <span className="qr-row-url" title={qr.destination_url}>{qr.destination_url}</span>
                                        <span className="qr-row-code">/r/{qr.short_code}</span>
                                    </div>
                                    <div className="qr-row-stats">
                                        <div className="stat">
                                            <span className="stat-value">{qr.scan_count}</span>
                                            <span className="stat-label">Scans</span>
                                        </div>
                                    </div>
                                    <div className="qr-row-actions">
                                        <button className="qr-row-btn" onClick={() => editQR(qr.short_code)}>Edit</button>
                                        <button className="qr-row-btn delete" onClick={() => deleteQR(qr.short_code)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <a href="/" className="nav-btn" style={{ marginTop: '16px', width: '100%', textAlign: 'center', display: 'block' }}>← Back to Generator</a>
                </div>
            </main>
        </>
    );
}

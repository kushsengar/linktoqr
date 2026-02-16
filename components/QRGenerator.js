'use client';

/**
 * components/QRGenerator.js — Use-case-first QR Generator
 * 
 * UX FLOW (redesigned):
 * 1. User picks a USE CASE (WiFi, UPI, WhatsApp, etc.)
 * 2. Shows URL input with use-case-specific placeholder
 * 3. "Track scans" toggle introduces dynamic mode naturally
 * 4. Advanced settings collapsed by default
 * 5. Result includes "Test Scan" instruction
 */

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const USE_CASES = [
    { id: 'website', emoji: '🌐', label: 'Website Link', placeholder: 'https://yourwebsite.com', desc: 'Any webpage or blog' },
    { id: 'wifi', emoji: '📶', label: 'WiFi', placeholder: 'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;', desc: 'Auto-connect guests' },
    { id: 'upi', emoji: '💳', label: 'UPI Payment', placeholder: 'upi://pay?pa=you@upi&pn=YourName&am=100', desc: 'Scan to pay instantly' },
    { id: 'whatsapp', emoji: '💬', label: 'WhatsApp', placeholder: 'https://wa.me/91XXXXXXXXXX?text=Hello', desc: 'Open a chat directly' },
    { id: 'menu', emoji: '🍽️', label: 'Menu / PDF', placeholder: 'https://drive.google.com/your-menu-pdf', desc: 'Contactless dining' },
    { id: 'social', emoji: '📱', label: 'Social Media', placeholder: 'https://instagram.com/yourprofile', desc: 'Grow followers offline' },
];

export default function QRGenerator() {
    const [selectedCase, setSelectedCase] = useState(null);
    const [url, setUrl] = useState('');
    const [trackScans, setTrackScans] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [size, setSize] = useState(200);
    const [fgColor, setFgColor] = useState('#ffffff');
    const [bgColor, setBgColor] = useState('#06060f');
    const [ecLevel, setEcLevel] = useState('M');
    const [generated, setGenerated] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const [shortUrl, setShortUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const canvasRef = useRef(null);

    function selectCase(useCase) {
        setSelectedCase(useCase);
        setUrl('');
        setGenerated(false);
        setError('');
        setShortUrl('');
    }

    function getPlaceholder() {
        if (!selectedCase) return 'Paste any link...';
        return selectedCase.placeholder;
    }

    async function generate() {
        if (!url.trim()) { setError('Please enter a URL or value'); return; }

        // For non-WiFi use cases, validate URL
        if (selectedCase?.id !== 'wifi') {
            try { new URL(url); } catch {
                setError('Please enter a valid URL (starting with https://)');
                return;
            }
        }

        setError('');
        setLoading(true);

        if (trackScans) {
            // Dynamic QR — create via API
            try {
                const token = localStorage.getItem('linktoqr_token');
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const res = await fetch('/api/qr', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ url })
                });

                const data = await res.json();
                if (!res.ok) {
                    if (data.upgrade) {
                        setError('Free plan limit reached (2 dynamic QR). Sign up or upgrade for more!');
                    } else {
                        setError(data.error || 'Failed to create');
                    }
                    setLoading(false);
                    return;
                }

                setQrValue(data.shortUrl);
                setShortUrl(data.shortUrl);
            } catch {
                setError('Network error. Please try again.');
                setLoading(false);
                return;
            }
        } else {
            // Static QR — encode directly in browser
            setQrValue(url);
            setShortUrl('');
        }

        setGenerated(true);
        setLoading(false);
    }

    function download() {
        const canvas = canvasRef.current?.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'linktoqr-code.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    async function copyImage() {
        const canvas = canvasRef.current?.querySelector('canvas');
        if (!canvas) return;
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch { /* fallback: download instead */ download(); }
    }

    function reset() {
        setSelectedCase(null);
        setUrl('');
        setGenerated(false);
        setQrValue('');
        setShortUrl('');
        setError('');
        setTrackScans(false);
    }

    return (
        <div className="card generator-card">
            {/* Step 1: Use-case selection */}
            {!selectedCase && !generated && (
                <div className="usecase-section">
                    <p className="usecase-label">What do you want to create?</p>
                    <div className="usecase-grid">
                        {USE_CASES.map(uc => (
                            <button key={uc.id} className="usecase-card" onClick={() => selectCase(uc)}>
                                <span className="usecase-emoji">{uc.emoji}</span>
                                <span className="usecase-name">{uc.label}</span>
                                <span className="usecase-desc">{uc.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: URL input + generate */}
            {selectedCase && !generated && (
                <div className="input-section">
                    <button className="back-btn" onClick={reset}>
                        ← Back to use cases
                    </button>

                    <div className="selected-case-header">
                        <span className="usecase-emoji-lg">{selectedCase.emoji}</span>
                        <h3>{selectedCase.label} QR Code</h3>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Your link or value</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            <input
                                type="text"
                                value={url}
                                onChange={e => { setUrl(e.target.value); setError(''); }}
                                placeholder={getPlaceholder()}
                            />
                            {url && <button className="clear-btn" onClick={() => setUrl('')}>✕</button>}
                        </div>
                        {error && <p className="input-hint error">{error}</p>}
                    </div>

                    {/* Track scans toggle — natural discovery of dynamic QR */}
                    <div className="track-toggle">
                        <label className="track-label">
                            <input
                                type="checkbox"
                                checked={trackScans}
                                onChange={e => setTrackScans(e.target.checked)}
                            />
                            <span className="track-switch"></span>
                            <span>Track scans &amp; edit later</span>
                            {trackScans && <span className="badge">Dynamic</span>}
                        </label>
                        {trackScans && (
                            <p className="track-hint">You can change the destination URL anytime — even after printing. Requires a free account.</p>
                        )}
                    </div>

                    {/* Advanced options — collapsed */}
                    <div className="advanced-section">
                        <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                            Advanced design options {showAdvanced ? '▴' : '▾'}
                        </button>
                        {showAdvanced && (
                            <div className="options-row">
                                <div className="option-group">
                                    <span className="option-label">Size</span>
                                    <select value={size} onChange={e => setSize(Number(e.target.value))}>
                                        <option value={150}>Small</option>
                                        <option value={200}>Medium</option>
                                        <option value={300}>Large</option>
                                        <option value={400}>XL</option>
                                    </select>
                                </div>
                                <div className="option-group">
                                    <span className="option-label">Error Fix</span>
                                    <select value={ecLevel} onChange={e => setEcLevel(e.target.value)}>
                                        <option value="L">Low</option>
                                        <option value="M">Medium</option>
                                        <option value="Q">High</option>
                                        <option value="H">Max</option>
                                    </select>
                                </div>
                                <div className="option-group">
                                    <span className="option-label">QR Color</span>
                                    <div className="color-picker-wrapper">
                                        <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} />
                                        <span className="color-value">{fgColor}</span>
                                    </div>
                                </div>
                                <div className="option-group">
                                    <span className="option-label">Background</span>
                                    <div className="color-picker-wrapper">
                                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                                        <span className="color-value">{bgColor}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="generate-btn cta-bright" onClick={generate} disabled={!url.trim() || loading}>
                        {loading ? (
                            <span className="btn-loader"><span className="spinner"></span></span>
                        ) : (
                            <>
                                <svg className="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                                </svg>
                                <span>Generate QR Code</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Step 3: Result */}
            {generated && (
                <div className="output-section">
                    <div className="qr-result">
                        <div className="qr-glow" ref={canvasRef}>
                            <QRCodeCanvas
                                value={qrValue}
                                size={size}
                                fgColor={fgColor}
                                bgColor={bgColor}
                                level={ecLevel}
                                includeMargin={true}
                            />
                        </div>

                        {/* Short URL for dynamic */}
                        {shortUrl && (
                            <div className="short-url-box">
                                <span className="short-url-label">Short URL:</span>
                                <span className="short-url">{shortUrl}</span>
                                <button className="copy-link-btn" onClick={() => navigator.clipboard.writeText(shortUrl)}>Copy</button>
                            </div>
                        )}

                        {/* Test Scan instruction */}
                        <div className="test-scan-hint">
                            <span className="test-scan-icon">📱</span>
                            <p>Scan with your phone camera to test it works</p>
                        </div>

                        {/* Action buttons */}
                        <div className="result-actions">
                            <button className="action-btn download-btn" onClick={download}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                <span>Download for printing (PNG)</span>
                            </button>
                            <button className="action-btn copy-btn" onClick={copyImage}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                                <span>Copy to clipboard</span>
                            </button>
                        </div>

                        {/* Create another */}
                        <button className="create-another-btn" onClick={reset}>
                            + Create another QR code
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

/**
 * components/QRGenerator.js — Reusable QR Generator Component
 * 
 * LEARNING (React Components):
 * - 'use client' = this runs in the browser, not on the server
 * - useState = remembers values between re-renders
 * - useRef = holds a reference to a DOM element
 * - This component is reused on the home page AND all SEO pages
 */

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export default function QRGenerator() {
    const [url, setUrl] = useState('');
    const [mode, setMode] = useState('static');
    const [size, setSize] = useState(300);
    const [ecLevel, setEcLevel] = useState('M');
    const [fgColor, setFgColor] = useState('#ffffff');
    const [bgColor, setBgColor] = useState('#0a0a1a');
    const [generated, setGenerated] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const [shortUrl, setShortUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [hint, setHint] = useState({ message: '', type: '' });
    const qrRef = useRef(null);

    // Validation
    function validateUrl(input) {
        if (!input.trim()) return { valid: false, message: '', type: '' };
        if (input.length > 2048) return { valid: false, message: 'URL too long (max 2048)', type: 'error' };
        try {
            const u = new URL(input);
            if (u.protocol === 'http:') return { valid: true, message: '⚠ HTTP — consider HTTPS', type: 'warning' };
            if (u.protocol === 'https:') return { valid: true, message: '✓ Valid secure URL', type: 'valid' };
            return { valid: true, message: '✓ Valid link', type: 'valid' };
        } catch {
            try {
                new URL('https://' + input);
                return { valid: false, message: `Did you mean https://${input}?`, type: 'warning' };
            } catch {
                return { valid: false, message: 'Please enter a valid URL', type: 'error' };
            }
        }
    }

    function handleUrlChange(e) {
        const val = e.target.value;
        setUrl(val);
        const result = validateUrl(val);
        setHint(result);
    }

    async function generate() {
        const validation = validateUrl(url);
        if (!validation.valid) return;
        setLoading(true);

        if (mode === 'dynamic') {
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
                if (!res.ok) throw new Error(data.error);

                setQrValue(data.shortUrl);
                setShortUrl(data.shortUrl);
                setGenerated(true);
            } catch (err) {
                setHint({ message: err.message, type: 'error' });
            }
        } else {
            setQrValue(url);
            setShortUrl('');
            setGenerated(true);
        }
        setLoading(false);
    }

    function download() {
        const canvas = qrRef.current?.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `linktoqr-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    async function copyImage() {
        const canvas = qrRef.current?.querySelector('canvas');
        if (!canvas) return;
        try {
            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setHint({ message: 'Copied to clipboard!', type: 'valid' });
        } catch {
            setHint({ message: 'Copy failed — try download', type: 'error' });
        }
    }

    const isValid = validateUrl(url).valid;

    return (
        <div className="card">
            {/* Mode Toggle */}
            <div className="mode-toggle">
                <button className={`mode-btn ${mode === 'static' ? 'active' : ''}`} onClick={() => setMode('static')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                    Static QR
                </button>
                <button className={`mode-btn ${mode === 'dynamic' ? 'active' : ''}`} onClick={() => setMode('dynamic')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /><circle cx="12" cy="12" r="3" /></svg>
                    Dynamic QR
                    <span className="badge">trackable</span>
                </button>
            </div>

            {/* Input Section */}
            <div className="input-section">
                <div className="input-group">
                    <label className="input-label" htmlFor="url-input">Enter URL</label>
                    <div className="input-wrapper">
                        <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <input
                            id="url-input"
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={handleUrlChange}
                            onKeyDown={(e) => e.key === 'Enter' && isValid && generate()}
                            className={hint.type === 'error' ? 'error' : hint.type === 'valid' ? 'valid' : ''}
                            autoComplete="off"
                            spellCheck="false"
                        />
                        {url && (
                            <button className="clear-btn" onClick={() => { setUrl(''); setHint({ message: '', type: '' }); }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {hint.message && <div className={`input-hint ${hint.type}`}>{hint.message}</div>}
                </div>

                {/* Options Row */}
                <div className="options-row">
                    <div className="option-group">
                        <label className="option-label">Size</label>
                        <select value={size} onChange={e => setSize(Number(e.target.value))}>
                            <option value={200}>200 × 200</option>
                            <option value={300}>300 × 300</option>
                            <option value={400}>400 × 400</option>
                            <option value={512}>512 × 512</option>
                        </select>
                    </div>
                    <div className="option-group">
                        <label className="option-label">Error Correction</label>
                        <select value={ecLevel} onChange={e => setEcLevel(e.target.value)}>
                            <option value="L">Low (7%)</option>
                            <option value="M">Medium (15%)</option>
                            <option value="Q">Quartile (25%)</option>
                            <option value="H">High (30%)</option>
                        </select>
                    </div>
                    <div className="option-group">
                        <label className="option-label">Foreground</label>
                        <div className="color-picker-wrapper">
                            <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} />
                            <span className="color-value">{fgColor}</span>
                        </div>
                    </div>
                    <div className="option-group">
                        <label className="option-label">Background</label>
                        <div className="color-picker-wrapper">
                            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                            <span className="color-value">{bgColor}</span>
                        </div>
                    </div>
                </div>

                <button className="generate-btn" disabled={!isValid || loading} onClick={generate}>
                    {loading ? (
                        <div className="btn-loader"><div className="spinner"></div></div>
                    ) : (
                        <>
                            <svg className="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                            <span>Generate QR Code</span>
                        </>
                    )}
                </button>
            </div>

            <div className="divider"></div>

            {/* Output */}
            <div className="output-section">
                {!generated ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                        </div>
                        <p>Your QR code will appear here</p>
                    </div>
                ) : (
                    <div className="qr-result">
                        <div className="qr-glow" ref={qrRef}>
                            <QRCodeCanvas
                                value={qrValue}
                                size={size}
                                fgColor={fgColor}
                                bgColor={bgColor}
                                level={ecLevel}
                                style={{ borderRadius: '8px' }}
                            />
                        </div>
                        {shortUrl && (
                            <div className="short-url-box">
                                <span className="short-url-label">Trackable link:</span>
                                <code className="short-url">{shortUrl}</code>
                                <button className="copy-link-btn" onClick={() => navigator.clipboard.writeText(shortUrl)}>Copy</button>
                            </div>
                        )}
                        <div className="result-actions">
                            <button className="action-btn download-btn" onClick={download}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                <span>Download PNG</span>
                            </button>
                            <button className="action-btn copy-btn" onClick={copyImage}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                <span>Copy Image</span>
                            </button>
                        </div>
                        <p className="result-url">{url.length > 80 ? url.substring(0, 80) + '…' : url}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

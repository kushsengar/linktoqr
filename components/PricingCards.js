'use client';

import { useState } from 'react';

export default function PricingCards() {
    const [toast, setToast] = useState('');

    function handlePlanClick(plan) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('linktoqr_token') : null;

        if (plan === 'free') {
            if (!token) setToast('Sign up free to get started with 2 dynamic QR codes!');
            else setToast("You're already on the Free plan!");
            return;
        }

        if (!token) {
            setToast('Sign up first, then upgrade your plan.');
            return;
        }

        const prices = { pro: '₹149/month', business: '₹399/month' };
        setToast(`To upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${prices[plan]}), email hello@linktoqr.com with your account email.`);
    }

    return (
        <section className="pricing-section">
            <h2 className="section-title">Simple pricing</h2>
            <p className="section-subtitle">Start free. Upgrade when you grow.</p>
            <div className="pricing-grid">
                <div className="price-card">
                    <div className="price-tier">Free</div>
                    <div className="price-amount">₹0<span>/forever</span></div>
                    <ul className="price-features">
                        <li>Unlimited static QR</li>
                        <li>2 dynamic QR codes</li>
                        <li>Basic scan count</li>
                    </ul>
                    <button className="price-btn price-btn-active" onClick={() => handlePlanClick('free')}>✓ Free forever</button>
                </div>
                <div className="price-card featured">
                    <div className="price-badge">Popular</div>
                    <div className="price-tier">Pro</div>
                    <div className="price-amount">₹149<span>/month</span></div>
                    <ul className="price-features">
                        <li>50 dynamic QR codes</li>
                        <li>Full scan analytics</li>
                        <li>Edit URL after printing</li>
                        <li>QR expiration dates</li>
                    </ul>
                    <button className="price-btn price-btn-primary" onClick={() => handlePlanClick('pro')}>Upgrade to Pro</button>
                </div>
                <div className="price-card">
                    <div className="price-tier">Business</div>
                    <div className="price-amount">₹399<span>/month</span></div>
                    <ul className="price-features">
                        <li>Unlimited dynamic QR</li>
                        <li>Password-protected QR</li>
                        <li>SVG high-res download</li>
                        <li>Priority support</li>
                    </ul>
                    <button className="price-btn" onClick={() => handlePlanClick('business')}>Upgrade to Business</button>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="pricing-toast" onClick={() => setToast('')}>
                    <p>{toast}</p>
                </div>
            )}
        </section>
    );
}

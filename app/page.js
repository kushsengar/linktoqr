/**
 * app/page.js — Home Page (UX-optimized)
 * 
 * FLOW: use case → success → discovery → upgrade
 * NOT:  tool → features → pricing
 */

import QRGenerator from '@/components/QRGenerator';
import Header from '@/components/Header';
import PricingCards from '@/components/PricingCards';
import seoPages from '@/lib/seo-pages.json';

export default function HomePage() {
    return (
        <>
            <div className="bg-orbs" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <main className="container">
                <Header />

                <div className="hero">
                    <h1>Create a QR code for<br /><span className="gradient-text">anything in seconds</span></h1>
                    <p className="subtitle">WiFi, payments, menus, social media — pick your use case and generate a free QR code instantly.</p>
                </div>

                <QRGenerator />

                {/* How it Works — keep simple */}
                <section className="how-it-works">
                    <h2 className="section-title">How it works</h2>
                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3>Pick your use case</h3>
                            <p>WiFi, payments, WhatsApp, menus, social media, or any link.</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3>Paste your link</h3>
                            <p>Enter your URL and hit generate. Your QR is ready in under 2 seconds.</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3>Download &amp; share</h3>
                            <p>Print it, share it, stick it anywhere. Enable tracking to see who scans.</p>
                        </div>
                    </div>
                </section>

                {/* QR Code Tools — with micro-descriptions (fix #8) */}
                <section className="tools-section">
                    <h2 className="section-title">Free QR Code Generators</h2>
                    <p className="section-subtitle">Pick your use case — each tool is optimized for its purpose</p>
                    <div className="tools-grid-detailed">
                        {seoPages.map(p => (
                            <a key={p.slug} href={`/${p.slug}`} className="tool-card">
                                <span className="tool-card-name">{p.h1.replace('Create ', '').replace('Generate ', '')}</span>
                                <span className="tool-card-desc">{p.description.split('.')[0]}</span>
                            </a>
                        ))}
                    </div>
                </section>

                {/* Pricing — moved below tools (fix #7) */}
                <PricingCards />

                <footer className="footer">
                    <p>100% open source · Your data stays yours · Built in India 🇮🇳</p>
                </footer>
            </main>
        </>
    );
}

/**
 * app/page.js — Home Page
 * 
 * LEARNING: This is a "Server Component" by default in Next.js App Router.
 * But since we import client components (QRGenerator, Header), those parts
 * hydrate in the browser while the rest is pre-rendered on the server.
 * 
 * This is the best of both worlds:
 * - Google sees fully rendered HTML (great for SEO)
 * - Users get interactive React components (great for UX)
 */

import QRGenerator from '@/components/QRGenerator';
import Header from '@/components/Header';
import PricingCards from '@/components/PricingCards';
import seoPages from '@/lib/seo-pages.json';

export default function HomePage() {
    return (
        <>
            {/* Background orbs */}
            <div className="bg-orbs" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <main className="container">
                <Header />

                <div className="hero">
                    <h1>Turn any link into a<br /><span className="gradient-text">trackable QR code</span></h1>
                    <p className="subtitle">Create dynamic QR codes. Track every scan. Change the destination anytime — even after printing.</p>
                </div>

                <QRGenerator />

                {/* How it Works */}
                <section className="how-it-works">
                    <h2 className="section-title">How it works</h2>
                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3>Paste your URL</h3>
                            <p>Enter any link — website, menu, form, payment page.</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3>Choose Static or Dynamic</h3>
                            <p><strong>Static</strong> = simple QR, no tracking.<br /><strong>Dynamic</strong> = trackable, editable anytime.</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3>Track &amp; manage</h3>
                            <p>Sign up → use Dynamic QR → open <strong>Dashboard</strong> to see scans and edit URLs.</p>
                        </div>
                    </div>
                </section>

                {/* All QR Code Tools — SEO Pages */}
                <section className="tools-section">
                    <h2 className="section-title">Free QR Code Tools</h2>
                    <p className="section-subtitle">Generate QR codes for any platform or use case</p>
                    <div className="tools-grid">
                        {seoPages.map(p => (
                            <a key={p.slug} href={`/${p.slug}`} className="tool-link">
                                {p.h1.replace('Create ', '').replace('Generate ', '')}
                            </a>
                        ))}
                    </div>
                </section>

                <PricingCards />

                <footer className="footer">
                    <p>100% open source · Your data stays yours · Built in India 🇮🇳</p>
                </footer>
            </main>
        </>
    );
}

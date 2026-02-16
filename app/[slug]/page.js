/**
 * app/[slug]/page.js — Programmatic SEO Template
 * 
 * LEARNING (Programmatic SEO):
 * ────────────────────────────
 * This SINGLE file generates 20+ unique landing pages at build time.
 * 
 * How?
 * 1. generateStaticParams() reads seo-pages.json
 * 2. For each entry, Next.js creates a static HTML page
 * 3. Each page has unique title, description, H1, and FAQ schema
 * 4. Google indexes each page separately → free organic traffic
 * 
 * Example: seo-pages.json entry with slug "wifi-qr-code-generator"
 *   → generates /wifi-qr-code-generator
 *   → Google shows it when someone searches "wifi qr code generator"
 *   → Free traffic to YOUR site
 * 
 * This is how companies like Zapier, Notion, and Canva
 * get MILLIONS of free visitors from Google.
 */

import { notFound } from 'next/navigation';
import seoPages from '@/lib/seo-pages.json';
import QRGenerator from '@/components/QRGenerator';
import Header from '@/components/Header';

// Pre-generate all SEO pages at build time
export function generateStaticParams() {
    return seoPages.map(page => ({ slug: page.slug }));
}

// Dynamic metadata for each page
export function generateMetadata({ params }) {
    const page = seoPages.find(p => p.slug === params.slug);
    if (!page) return {};

    return {
        title: page.title,
        description: page.description,
        openGraph: {
            title: page.title,
            description: page.description,
        },
    };
}

export default function SeoPage({ params }) {
    const page = seoPages.find(p => p.slug === params.slug);
    if (!page) notFound();

    // FAQ Schema markup (Google shows these as rich snippets)
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.faq.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
    };

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
                    <h1><span className="gradient-text">{page.h1}</span></h1>
                    <p className="subtitle">{page.description}</p>
                </div>

                <QRGenerator />

                {/* SEO Content */}
                <section className="seo-content">
                    <h2>About {page.h1}</h2>
                    <p>{page.body}</p>
                </section>

                {/* FAQ */}
                <section className="faq-section">
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <div className="faq-list">
                        {page.faq.map((item, i) => (
                            <details key={i} className="faq-item">
                                <summary>{item.q}</summary>
                                <p>{item.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* All Tools Links */}
                <section className="tools-section">
                    <h2 className="section-title">More QR Code Tools</h2>
                    <div className="tools-grid">
                        {seoPages.filter(p => p.slug !== page.slug).slice(0, 8).map(p => (
                            <a key={p.slug} href={`/${p.slug}`} className="tool-link">
                                {p.h1.replace('Create ', '').replace('a ', '').replace('an ', '')}
                            </a>
                        ))}
                    </div>
                </section>

                <footer className="footer">
                    <p><a href="/">← Back to LinkToQR</a> · 100% open source · Built in India 🇮🇳</p>
                </footer>
            </main>

            {/* FAQ Schema for Google Rich Snippets */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
        </>
    );
}

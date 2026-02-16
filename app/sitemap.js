/**
 * app/sitemap.js — Dynamic Sitemap Generator
 * 
 * LEARNING: Next.js auto-generates sitemap.xml from this function.
 * Google uses sitemaps to discover your pages.
 * Without this, Google might miss your 20+ SEO pages.
 */

import seoPages from '@/lib/seo-pages.json';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://linktoqr.com';

export default function sitemap() {
    const staticPages = [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
        { url: `${BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ];

    const seoPageEntries = seoPages.map(page => ({
        url: `${BASE_URL}/${page.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
    }));

    return [...staticPages, ...seoPageEntries];
}

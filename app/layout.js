/**
 * app/layout.js — Root Layout
 * 
 * LEARNING: In Next.js App Router, layout.js wraps ALL pages.
 * It's like putting a <head> and <body> around everything.
 * This is where you load fonts, global CSS, and set metadata.
 */

import './globals.css';

export const metadata = {
    title: {
        default: 'LinkToQR — Free Dynamic QR Code Generator with Analytics',
        template: '%s | LinkToQR',
    },
    description: 'Create free QR codes for any URL. Track scans, change destinations anytime. WiFi QR, UPI QR, WhatsApp QR and more.',
    keywords: ['QR code generator', 'dynamic QR', 'QR analytics', 'free QR code', 'trackable QR'],
    openGraph: {
        title: 'LinkToQR — Dynamic QR Code Generator',
        description: 'Create, track, and manage QR codes. Free forever.',
        type: 'website',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}

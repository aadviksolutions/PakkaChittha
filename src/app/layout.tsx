import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { SITE_URL } from '@/lib/seo/constants';
import { GTM_CONTAINER_ID, buildGtmHeadScript } from '@/lib/analytics/gtm';
import { GtmNavigationTracker } from '@/components/analytics/GtmNavigationTracker';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Pakka Chittha | Billing • Inventory • Udhari • Reports',
  description:
    'Simple billing, inventory management, udhari tracking, and business reports for Indian businesses.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Pakka Chittha | Billing • Inventory • Udhari • Reports',
    description:
      'Simple billing, inventory management, udhari tracking, and business reports for Indian businesses.',
    siteName: 'Pakka Chittha',
    images: [{ url: '/pakka-chittha-logo.png' }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <Script
          id="google-tag-manager"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: buildGtmHeadScript(GTM_CONTAINER_ID),
          }}
        />
        <GtmNavigationTracker />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

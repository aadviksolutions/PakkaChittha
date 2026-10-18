import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Pakka Chittha | Billing • Inventory • Udhari • Reports',
  description:
    'Simple billing, inventory management, udhari tracking, and business reports for Indian businesses.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

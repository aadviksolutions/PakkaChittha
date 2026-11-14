import type { Metadata } from 'next';
import React from 'react';
import { KnowledgeHeader } from '@/components/knowledge/KnowledgeHeader';
import { KnowledgeFooter } from '@/components/knowledge/KnowledgeFooter';
import { SITE_URL } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: {
    template: '%s | PakkaChittha Knowledge Hub (ज्ञान केंद्र)',
    default: 'PakkaChittha Knowledge Hub | हर सवाल का जवाब, अब एक ही जगह!',
  },
  description:
    'Free public awareness and education portal for GST, taxation, invoicing, udhar recovery, inventory, government MSME schemes, cyber fraud safety, and legal compliance.',
  keywords: [
    'GST Rules India',
    'Billing Invoicing Guide',
    'Udhar Recovery Legal Rules',
    'MSME Government Schemes',
    'Cyber Fraud Protection',
    'PakkaChittha Knowledge Hub',
    'पक्काचिट्ठा ज्ञान केंद्र',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: `${SITE_URL}/knowledge`,
    siteName: 'PakkaChittha Knowledge Hub',
    title: 'PakkaChittha Knowledge Hub | हर सवाल का जवाब, अब एक ही जगह!',
    description:
      'Free public education & awareness for citizens, shopkeepers, small businesses, and professionals.',
  },
  alternates: {
    canonical: `${SITE_URL}/knowledge`,
  },
};

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <KnowledgeHeader />
      <main className="flex-1 w-full">
        {children}
      </main>
      <KnowledgeFooter />
    </div>
  );
}


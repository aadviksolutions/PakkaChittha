import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Pricing & Subscription Plans — Starter, Growth & Scale | Pakka Chittha',
  description:
    'Transparent monthly, quarterly, half-yearly, and annual plans for Indian retail shops and wholesalers. Start a 7-day free trial or use Ghar Kharcha free forever.',
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
  openGraph: {
    title: 'Pricing & Subscription Plans | Pakka Chittha',
    description:
      'Compare Starter, Growth, and Scale plans for GST billing, stock inventory, and WhatsApp udhaar reminders.',
    type: 'website',
    url: `${SITE_URL}/pricing`,
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


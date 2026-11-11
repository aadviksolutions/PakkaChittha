import type { Metadata } from 'next';
import { getCurrentSession } from '@/lib/auth/session';
import { PublicHomePage } from '@/components/marketing/PublicHomePage';
import { AuthenticatedHomeView } from '@/components/dashboard/AuthenticatedHomeView';
import { SITE_URL, NOINDEX_METADATA } from '@/lib/seo/constants';

export async function generateMetadata(): Promise<Metadata> {
  const session = await getCurrentSession();

  if (session) {
    return {
      title: 'Dashboard | Pakka Chittha',
      description: 'Pakka Chittha business billing, inventory, and udhaar workspace.',
      ...NOINDEX_METADATA,
    };
  }

  const title = 'Pakka Chittha: Free GST Billing, Inventory & Udhaar Hisab Kitab Software';
  const description =
    "Manage your shop's GST billing, stock inventory, customer udhaar ledger, and WhatsApp invoices with Pakka Chittha. Includes 100% Free Ghar Kharcha app. Start Free Trial!";

  return {
    title,
    description,
    keywords: [
      'GST billing software',
      'hisab kitab app',
      'udhaar khata software',
      'inventory management India',
      'thermal printer billing software',
      'free ghar kharcha app',
      'Pakka Chittha',
    ],
    alternates: {
      canonical: `${SITE_URL}/`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/`,
      siteName: 'Pakka Chittha',
      images: [{ url: '/pakka-chittha-logo.png', alt: 'Pakka Chittha Logo' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/pakka-chittha-logo.png'],
    },
  };
}

export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    return <PublicHomePage />;
  }

  return <AuthenticatedHomeView />;
}

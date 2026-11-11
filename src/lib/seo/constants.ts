import type { Metadata } from 'next';

export const SITE_URL = 'https://pakkachittha.com';

export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export interface FeatureNavItem {
  title: string;
  shortTitle: string;
  href: string;
  description: string;
  badge: string;
}

export const PUBLIC_FEATURE_PAGES: FeatureNavItem[] = [
  {
    title: 'GST Billing & Thermal Printing Software',
    shortTitle: 'GST Billing Software',
    href: '/gst-billing-software',
    description: 'Create GST & non-GST bills in seconds with A4 & thermal printer support.',
    badge: 'Billing & Tax',
  },
  {
    title: 'Udhaar Khata & Digital Customer Ledger',
    shortTitle: 'Udhaar Khata Management',
    href: '/udhaar-khata-management',
    description: 'Track customer credit, partial payments & WhatsApp payment reminders.',
    badge: 'Ledger & Recovery',
  },
  {
    title: 'Real-Time Inventory & Stock Software',
    shortTitle: 'Inventory & Stock Software',
    href: '/inventory-stock-software',
    description: 'Live stock updates synced with bills, low-stock alerts & stock reports.',
    badge: 'Stock & Expenses',
  },
  {
    title: '100% Free Ghar Kharcha Tracker App',
    shortTitle: 'Ghar Kharcha App (Free)',
    href: '/ghar-kharcha-app',
    description: 'Forever-free household daily expense tracker separate from business.',
    badge: '100% Free Forever',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const HOMEPAGE_FAQS: FaqItem[] = [
  {
    question: 'What is Pakka Chittha software used for?',
    answer:
      'Pakka Chittha is an all-in-one GST billing, stock inventory management, customer udhaar khata, and WhatsApp invoicing software designed for Indian retail shops, wholesalers, and small businesses. It also includes a 100% free Ghar Kharcha mode to track personal household expenses separately.',
  },
  {
    question: 'Can I use a thermal printer with Pakka Chittha?',
    answer:
      'Yes. Pakka Chittha supports both standard A4 laser/inkjet invoices and compact thermal receipt printers (2-inch and 3-inch formats), so you can print clean retail bills at your shop counter without complicated setup.',
  },
  {
    question: 'Is the Ghar Kharcha feature really free?',
    answer:
      'Yes, the Ghar Kharcha mode on Pakka Chittha is 100% free forever with no hidden charges or credit card required. You can record daily household spending, manage monthly budgets, and keep personal expenses strictly separate from your shop accounts.',
  },
  {
    question: 'Can I send bills and udhaar reminders on WhatsApp?',
    answer:
      'Yes. You can share digital invoices, itemized bill summaries, and polite pending udhaar payment reminders directly to customers on WhatsApp with one click to collect payments faster.',
  },
  {
    question: 'How can I start using Pakka Chittha?',
    answer:
      'Click "Start 7-Day Free Trial" on Pakka Chittha, enter your basic details or sign in with Google, and choose either Business Workspace (Mera Vyapaar) with a 7-day free trial or Free Ghar Kharcha / Personal Khata (Mera Ghar). You can start creating bills in under 2 minutes.',
  },
];

export function buildFaqJsonLd(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Pakka Chittha',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE_URL}/`,
    description:
      "Manage your shop's GST billing, stock inventory, customer udhaar ledger, and WhatsApp invoices with Pakka Chittha. Includes 100% Free Ghar Kharcha app.",
    offers: [
      {
        '@type': 'Offer',
        name: '7-Day Business Free Trial (GST Billing, Inventory & Udhaar)',
        price: '0',
        priceCurrency: 'INR',
      },
      {
        '@type': 'Offer',
        name: '100% Free Ghar Kharcha & Personal Khata',
        price: '0',
        priceCurrency: 'INR',
      },
    ],
  };
}


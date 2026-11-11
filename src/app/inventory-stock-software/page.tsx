import type { Metadata } from 'next';
import {
  FeatureLandingTemplate,
  type FeatureLandingContent,
} from '@/components/marketing/FeatureLandingTemplate';
import { SITE_URL } from '@/lib/seo/constants';

const PAGE_TITLE = 'Real-Time Inventory & Stock Management Software for Businesses | Pakka Chittha';
const PAGE_DESCRIPTION =
  "Manage your shop's products, stock levels, and daily expenses in one place. Get low-stock alerts and real-time inventory reports with Pakka Chittha. Start free trial!";
const PAGE_URL = `${SITE_URL}/inventory-stock-software`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'Inventory management software for small business',
    'stock tracking app India',
    'dukaan stock register software',
    'Pakka Chittha inventory',
  ],
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: 'website',
    url: PAGE_URL,
    siteName: 'Pakka Chittha',
    images: [{ url: '/pakka-chittha-logo.png', alt: 'Pakka Chittha Inventory Management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/pakka-chittha-logo.png'],
  },
};

const CONTENT: FeatureLandingContent = {
  badge: 'Live Stock Register & Expense Control',
  breadcrumbLabel: 'Inventory & Stock Software',
  h1: 'Smart Product & Stock Inventory Management for Indian Retailers',
  subheading:
    'Keep every item in stock under control. Automatically deduct quantities when billing, add supplier purchases, receive low-stock alerts, and track business expenses in one dashboard.',
  primaryCtaLabel: 'Start 7-Day Free Trial',
  primaryCtaHref: '/register',
  secondaryCtaLabel: 'Compare Plans',
  secondaryCtaHref: '/pricing',
  highlights: [
    'Instant stock deduction on sales and restocking on purchase entries',
    'Proactive low-stock alerts directly on your main business dashboard',
    'Expense tracking alongside purchase bills and gross margin summaries',
    'Exportable daily, weekly, and monthly stock & valuation reports',
  ],
  sectionsHeading: 'Stop Guessing What Is Left in Your Godown or Shelf',
  sectionsSubheading:
    'Eliminate manual stock counting mistakes and avoid losing customers due to out-of-stock fast-moving products.',
  keySections: [
    {
      title: 'Live Stock Updates Automatically Synced with Every Bill',
      description:
        'Every time you save a GST sale invoice or supplier purchase bill, Pakka Chittha updates item quantities immediately across your workspace.',
      icon: 'package',
    },
    {
      title: 'Low-Stock Alerts to Prevent Out-of-Stock Losses',
      description:
        'Set reorder thresholds on key SKUs and spot low-stock items on your dashboard watchlist early so you can reorder from suppliers in time.',
      icon: 'bell',
    },
    {
      title: 'Track Business Expenses Alongside Product Margins',
      description:
        'Record shop rent, transport, electricity, and staff expenses right alongside supplier purchases to see accurate net profitability.',
      icon: 'trending',
    },
    {
      title: 'Downloadable Daily, Weekly & Monthly Stock Reports',
      description:
        'Review closing stock value, fast-selling categories, and supplier purchase trends in downloadable CSV/Excel reports anytime.',
      icon: 'chart',
    },
  ],
  howItWorksHeading: 'Organize Your Dukaan Inventory in 3 Simple Steps',
  howItWorksSteps: [
    {
      step: '1',
      title: 'Add Your Product Catalog',
      description:
        'Enter item names, purchase/sale prices, GST slabs, units, and opening stock quantities.',
    },
    {
      step: '2',
      title: 'Bill & Restock Normally',
      description:
        'Create customer invoices and supplier purchase bills as usual — inventory counts adjust in real time.',
    },
    {
      step: '3',
      title: 'Monitor Alerts & Export Reports',
      description:
        'Check low-stock warnings daily and export complete inventory summaries for audits or tax filing.',
    },
  ],
  relatedSolutions: [
    {
      title: 'Fast GST Billing & Thermal Printer Software',
      description:
        'Create GST bills directly from your live product catalog and deduct sold quantities automatically.',
      href: '/gst-billing-software',
    },
    {
      title: 'Smart Customer Udhaar Khata Management',
      description:
        'Link credit sales to customer ledgers and trigger WhatsApp payment reminders to keep cashflow healthy.',
      href: '/udhaar-khata-management',
    },
  ],
  faqs: [
    {
      question: 'Does stock reduce automatically when I create a bill?',
      answer:
        'Yes. Whenever you generate a sale invoice for stocked items, quantities are deducted automatically, and supplier purchase entries increase available stock.',
    },
    {
      question: 'Can I track shop expenses along with stock and sales?',
      answer:
        'Yes. Pakka Chittha includes a dedicated Expenses section to log daily business overheads alongside inventory purchases and sales.',
    },
    {
      question: 'Which subscription plans include Low-Stock Alerts and CSV exports?',
      answer:
        'Product catalog & stock management starts right from the Starter plan, while proactive low-stock alerts and bulk CSV/Excel reports are included in Growth and Scale plans (all unlocked during your 7-day free trial).',
    },
  ],
  bottomCtaHeading: 'Take Control of Your Shop Stock & Expenses Today',
  bottomCtaBody:
    'Start your 7-day free trial on Pakka Chittha with full GST billing, real-time inventory, and low-stock alerts.',
};

export default function InventoryStockSoftwarePage() {
  return <FeatureLandingTemplate content={CONTENT} />;
}


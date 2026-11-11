import type { Metadata } from 'next';
import {
  FeatureLandingTemplate,
  type FeatureLandingContent,
} from '@/components/marketing/FeatureLandingTemplate';
import { SITE_URL } from '@/lib/seo/constants';

const PAGE_TITLE = 'Free GST Billing & Thermal Printer Software for Retail Shops | Pakka Chittha';
const PAGE_DESCRIPTION =
  'Create professional GST & non-GST invoices in seconds with Pakka Chittha. Supports A4 & thermal printers, WhatsApp bill sharing, and instant tax reports. Try free!';
const PAGE_URL = `${SITE_URL}/gst-billing-software`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'Free GST billing software for retail shop',
    'thermal printer billing software',
    'GST invoice maker India',
    'Pakka Chittha GST billing',
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
    images: [{ url: '/pakka-chittha-logo.png', alt: 'Pakka Chittha GST Billing Software' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/pakka-chittha-logo.png'],
  },
};

const CONTENT: FeatureLandingContent = {
  badge: 'GST & Non-GST Counter Billing',
  breadcrumbLabel: 'GST Billing Software',
  h1: 'Fast & Easy GST Billing Software for Indian Shops & Businesses',
  subheading:
    'Generate accurate GST and non-GST bills in seconds, print effortlessly on thermal receipt printers or A4 sheets, and share PDF invoices directly on WhatsApp.',
  primaryCtaLabel: 'Start 7-Day Free Trial',
  primaryCtaHref: '/register',
  secondaryCtaLabel: 'View Pricing Plans',
  secondaryCtaHref: '/pricing',
  highlights: [
    'Automatic CGST, SGST & IGST calculation with HSN tax summary',
    '2-inch / 3-inch thermal receipt printer & classic A4 PDF print layouts',
    'Instant WhatsApp invoice sharing & printable payment QR',
    'Convert customer estimates and quotations into GST bills in one click',
  ],
  sectionsHeading: 'Built for Fast Counter Billing Without Errors',
  sectionsSubheading:
    'Whether you run a kirana shop, hardware store, pharmacy, or wholesale business, Pakka Chittha keeps every bill compliant and organized.',
  keySections: [
    {
      title: 'Instant GST & Non-GST Invoicing (CGST, SGST, IGST Auto-Calculation)',
      description:
        'Select items and let Pakka Chittha calculate item-wise GST rates, taxable totals, CGST/SGST splits for intra-state sales, and IGST for inter-state customers automatically.',
      icon: 'file',
    },
    {
      title: 'Seamless Thermal Receipt Printer & A4 Print Support',
      description:
        'Print clean counter receipts on standard USB/Bluetooth thermal printers or switch to detailed A4 invoices with your shop logo, GSTIN, and terms.',
      icon: 'printer',
    },
    {
      title: 'One-Click WhatsApp Invoice & PDF Sharing',
      description:
        'Save paper and delight customers by sending crisp digital bills and itemized totals straight to their WhatsApp number immediately after checkout.',
      icon: 'whatsapp',
    },
    {
      title: 'Quotations & Estimates to Bill Conversion',
      description:
        'Prepare quick price quotes or estimates for bulk buyers and convert approved quotations directly into finalized GST invoices without re-typing items.',
      icon: 'chart',
    },
  ],
  howItWorksHeading: 'Create Your First GST Invoice in 3 Easy Steps',
  howItWorksSteps: [
    {
      step: '1',
      title: 'Set Up Shop & GST Details',
      description:
        'Sign up for your 7-day free trial and add your business name, GSTIN, address, and preferred invoice series.',
    },
    {
      step: '2',
      title: 'Add Items & Customer Info',
      description:
        'Pick products from your catalog with preset HSN/tax slabs, apply discounts or partial cash/credit payments.',
    },
    {
      step: '3',
      title: 'Print Thermal Bill or Share on WhatsApp',
      description:
        'Generate the invoice in one click, print on your thermal or A4 printer, or share directly on WhatsApp.',
    },
  ],
  relatedSolutions: [
    {
      title: 'Digital Customer Ledger & Udhaar Khata Management',
      description:
        'Automatically record unpaid bill balances into your customer udhaar khata and send payment reminders on WhatsApp.',
      href: '/udhaar-khata-management',
    },
    {
      title: 'Real-Time Stock & Inventory Management Software',
      description:
        'Sync every GST sale bill with your live shop stock register and receive timely low-stock alerts.',
      href: '/inventory-stock-software',
    },
  ],
  faqs: [
    {
      question: 'Does Pakka Chittha support both thermal printers and A4 printers?',
      answer:
        'Yes. Every invoice generated in Pakka Chittha includes clean formatting for both compact thermal receipt printers and standard A4 laser/inkjet printers.',
    },
    {
      question: 'Can I make both GST and regular non-GST bills in the same shop account?',
      answer:
        'Yes. You can create compliant tax invoices with CGST, SGST, and IGST breakdowns as well as non-GST estimates or retail bills whenever needed.',
    },
    {
      question: 'What happens to unpaid credit bills when I raise an invoice?',
      answer:
        'Any unpaid or partially paid balance on a bill automatically updates that customer’s udhaar ledger balance so your hisab-kitab always stays accurate.',
    },
  ],
  bottomCtaHeading: 'Start Creating Fast GST & Thermal Bills Today',
  bottomCtaBody:
    'Get full access to GST invoicing, thermal printing, quotations, and WhatsApp bill sharing free for 7 days.',
};

export default function GstBillingSoftwarePage() {
  return <FeatureLandingTemplate content={CONTENT} />;
}


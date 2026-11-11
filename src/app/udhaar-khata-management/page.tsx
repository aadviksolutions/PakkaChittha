import type { Metadata } from 'next';
import {
  FeatureLandingTemplate,
  type FeatureLandingContent,
} from '@/components/marketing/FeatureLandingTemplate';
import { SITE_URL } from '@/lib/seo/constants';

const PAGE_TITLE = 'Smart Customer Udhaar Khata & Digital Ledger Software | Pakka Chittha';
const PAGE_DESCRIPTION =
  "Replace paper bahi-khata with Pakka Chittha's digital customer ledger. Track pending udhaar, record partial payments, and send WhatsApp payment reminders easily.";
const PAGE_URL = `${SITE_URL}/udhaar-khata-management`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'Digital udhaar khata app for PC',
    'customer ledger software',
    'hisab kitab software for shop',
    'Pakka Chittha udhaar khata',
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
    images: [{ url: '/pakka-chittha-logo.png', alt: 'Pakka Chittha Udhaar Khata Software' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/pakka-chittha-logo.png'],
  },
};

const CONTENT: FeatureLandingContent = {
  badge: 'Smart Customer Khata & Recovery',
  breadcrumbLabel: 'Udhaar Khata Management',
  h1: 'Digital Customer Ledger & Udhaar Khata Management Software',
  subheading:
    'Ditch manual paper bahi-khata books. Maintain accurate customer-wise credit and debit records, record partial collections, and recover pending dues faster with WhatsApp reminders.',
  primaryCtaLabel: 'Start 7-Day Free Trial',
  primaryCtaHref: '/register',
  secondaryCtaLabel: 'Try Free Personal Khata',
  secondaryCtaHref: '/register?plan=free_khata',
  highlights: [
    'Customer-wise credit, debit, and running balance history on desktop & mobile',
    'Automated and one-tap WhatsApp payment reminders with pending amount summary',
    'Real-time tracking of partial payments, advances, and settled bills',
    'Role-based multi-staff access backed by 100% encrypted cloud storage',
  ],
  sectionsHeading: 'Faster Udhaar Recovery With Complete Transparency',
  sectionsSubheading:
    'Keep shopkeeper-customer trust strong with crystal-clear payment records and timely WhatsApp follow-ups.',
  keySections: [
    {
      title: 'Complete Customer-Wise Credit & Debit History',
      description:
        'View every customer’s total amount given, payments received, invoice references, and running closing balance in one clean searchable timeline.',
      icon: 'book',
    },
    {
      title: 'Automated WhatsApp Payment Reminders for Faster Recovery',
      description:
        'Send polite English or Hindi payment reminders showing exact pending dues on WhatsApp so customers pay on time without awkward phone calls.',
      icon: 'bell',
    },
    {
      title: 'Track Partial Payments, Advances & Receipts in Real Time',
      description:
        'Accept part-payments via cash or UPI, record advance deposits cleanly, and automatically update outstanding balances without manual math.',
      icon: 'wallet',
    },
    {
      title: 'Multi-Staff Access with Secure Cloud Backup',
      description:
        'Allow cashiers or billing staff to enter daily collections while your complete digital khata remains safely synced in the cloud across devices.',
      icon: 'users',
    },
  ],
  howItWorksHeading: 'Move Your Bahi-Khata Digital in Minutes',
  howItWorksSteps: [
    {
      step: '1',
      title: 'Add Customers or Link Credit Bills',
      description:
        'Create customer accounts in seconds or record credit entries automatically while generating GST or retail invoices.',
    },
    {
      step: '2',
      title: 'Record Collections & Part Payments',
      description:
        'Update partial or full payments via cash, bank transfer, or UPI anytime from PC or mobile.',
    },
    {
      step: '3',
      title: 'Send Instant WhatsApp Reminders',
      description:
        'Monitor overdue accounts from your dashboard watchlist and trigger WhatsApp payment reminders with one tap.',
    },
  ],
  relatedSolutions: [
    {
      title: 'Fast GST Billing & Thermal Printer Software',
      description:
        'Generate itemized GST bills and link unpaid invoice balances directly to each customer ledger.',
      href: '/gst-billing-software',
    },
    {
      title: '100% Free Ghar Kharcha Tracker App',
      description:
        'Need to manage personal or family expenses separately from business udhaar? Use Ghar Kharcha free forever.',
      href: '/ghar-kharcha-app',
    },
  ],
  faqs: [
    {
      question: 'Can I use Pakka Chittha Udhaar Khata on both PC and mobile?',
      answer:
        'Yes. Pakka Chittha works smoothly on desktop web browsers at your billing counter as well as on mobile browsers, with real-time cloud synchronization.',
    },
    {
      question: 'Is there a free personal khata option if I only want friend/family tracking?',
      answer:
        'Yes. Individuals who only want to track personal money given or taken with contacts can sign up for Free Personal Khata without purchasing a business plan.',
    },
    {
      question: 'Can I edit or delete a wrong udhaar entry later?',
      answer:
        'Yes. Authorized account owners can edit or delete erroneous transactions anytime, and Pakka Chittha recalculates outstanding customer balances automatically.',
    },
  ],
  bottomCtaHeading: 'Collect Pending Udhaar Faster Without Paper Registers',
  bottomCtaBody:
    'Start your 7-day free business trial for linked GST billing & customer ledgers, or sign up for Free Personal Khata.',
};

export default function UdhaarKhataManagementPage() {
  return <FeatureLandingTemplate content={CONTENT} />;
}


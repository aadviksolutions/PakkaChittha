import type { Metadata } from 'next';
import {
  FeatureLandingTemplate,
  type FeatureLandingContent,
} from '@/components/marketing/FeatureLandingTemplate';
import { SITE_URL } from '@/lib/seo/constants';

const PAGE_TITLE = '100% Free Ghar Kharcha & Daily Household Expense Tracker | Pakka Chittha';
const PAGE_DESCRIPTION =
  'Track your daily household expenses (Ghar Kharcha) completely free forever with Pakka Chittha. Keep personal finances separate from your business workspace.';
const PAGE_URL = `${SITE_URL}/ghar-kharcha-app`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'Free ghar kharcha app',
    'daily household expense tracker India',
    'personal kharcha hisab app',
    'Pakka Chittha ghar kharcha',
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
    images: [{ url: '/pakka-chittha-logo.png', alt: 'Pakka Chittha Free Ghar Kharcha App' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/pakka-chittha-logo.png'],
  },
};

const CONTENT: FeatureLandingContent = {
  badge: 'Mera Ghar • 100% Free Forever',
  breadcrumbLabel: 'Free Ghar Kharcha App',
  h1: '100% Free Ghar Kharcha & Daily Expense Tracker App',
  subheading:
    'Record daily household expenses, track groceries, utility bills, and monthly family budgets in a simple, ad-free space that stays completely free forever.',
  primaryCtaLabel: 'Start Free Ghar Kharcha Now',
  primaryCtaHref: '/register?plan=ghar_kharcha',
  secondaryCtaLabel: 'Login to Workspace',
  secondaryCtaHref: '/login',
  highlights: [
    '100% Free Forever for individuals and families — no trial expiry lock',
    'Strictly separate from your shop GST billing and business inventory workspace',
    'Category-wise daily, monthly, and yearly household spending insights',
    'Easy budget setup, family member invites, and instant edit/delete controls',
  ],
  sectionsHeading: 'Household Budgeting Made Simple for Every Indian Family',
  sectionsSubheading:
    'Stop mixing personal home expenses with your shop cash register. Keep every rupee accounted for effortlessly.',
  keySections: [
    {
      title: 'Completely Free Forever — No Hidden Charges',
      description:
        'Use Ghar Kharcha and Personal Khata for free without worrying about 7-day trial expiration, subscription lock screens, or surprise fees.',
      icon: 'shield',
    },
    {
      title: 'Separate Personal Household Spending from Business Accounts',
      description:
        'Even if you also run a shop on Mera Vyapaar, your Ghar Kharcha records remain neatly isolated in your household space with one-tap mode switching.',
      icon: 'home',
    },
    {
      title: 'Simple Category-Wise Daily, Monthly & Yearly Expense Summary',
      description:
        'Track ration, milk, school fees, electricity, medical bills, and travel under simple categories with clear monthly budget tracking.',
      icon: 'wallet',
    },
    {
      title: 'Accessible Anytime on Mobile & Desktop Browser',
      description:
        'Log expenses in seconds from your phone browser or laptop with full English and Hindi language support and cloud backup.',
      icon: 'cloud',
    },
  ],
  howItWorksHeading: 'Start Tracking Your Ghar Kharcha in Under 1 Minute',
  howItWorksSteps: [
    {
      step: '1',
      title: 'Create Your Free Ghar Kharcha Account',
      description:
        'Click "Start Free Ghar Kharcha Now" or sign in with Google and select Mera Ghar mode — no card needed.',
    },
    {
      step: '2',
      title: 'Set Monthly Budget & Add Daily Expenses',
      description:
        'Log daily household spending with categories, payment modes, and optional notes or family member sharing.',
    },
    {
      step: '3',
      title: 'Review Clear Monthly Insights',
      description:
        'See where your money goes each month and easily edit or manage any transaction anytime.',
    },
  ],
  relatedSolutions: [
    {
      title: 'Digital Udhaar & Personal Khata Management',
      description:
        'Lend or borrow money with friends and contacts? Track personal receivables & payables cleanly alongside Ghar Kharcha.',
      href: '/udhaar-khata-management',
    },
    {
      title: 'Pakka Chittha Complete Platform Overview',
      description:
        'Also running a shop or business? Explore GST billing, thermal printing, and stock management in Mera Vyapaar.',
      href: '/',
    },
  ],
  faqs: [
    {
      question: 'Is the Pakka Chittha Ghar Kharcha app really free forever?',
      answer:
        'Yes. Household expense tracking in Mera Ghar (Ghar Kharcha) is permanently free and never gets locked after any business trial ends.',
    },
    {
      question: 'Will my Ghar Kharcha entries mix with my business GST accounts?',
      answer:
        'No. Ghar Kharcha operates in its own isolated household space, completely separate from your business GST invoices, customers, and inventory.',
    },
    {
      question: 'Can multiple family members record expenses in one Ghar Kharcha space?',
      answer:
        'Yes. You can invite trusted family members to your Ghar Kharcha household workspace and track combined daily expenses together.',
    },
  ],
  bottomCtaHeading: 'Take Charge of Your Monthly Household Budget for Free',
  bottomCtaBody:
    'Join Pakka Chittha Mera Ghar today — track daily expenses, groceries, and bills completely free forever.',
};

export default function GharKharchaAppPage() {
  return <FeatureLandingTemplate content={CONTENT} />;
}


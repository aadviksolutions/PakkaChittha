import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Business Expenses | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


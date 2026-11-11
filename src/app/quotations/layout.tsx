import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Quotations | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function QuotationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


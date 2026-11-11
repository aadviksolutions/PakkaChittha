import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Customers & Udhaar | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


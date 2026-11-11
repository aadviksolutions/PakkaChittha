import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Purchases | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Invoices | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


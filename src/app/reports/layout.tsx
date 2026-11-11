import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Reports & GST Analytics | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


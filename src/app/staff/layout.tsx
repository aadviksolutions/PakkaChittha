import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Staff & Access Control | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'View Document | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function ViewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


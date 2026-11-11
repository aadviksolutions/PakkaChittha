import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Register & Start Free Trial | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


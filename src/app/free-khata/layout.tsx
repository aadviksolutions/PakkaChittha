import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Personal Khata | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function FreeKhataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Ghar Kharcha Workspace | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function GharKharchaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Business Settings | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


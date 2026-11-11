import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Choose App Mode | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function SelectModeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


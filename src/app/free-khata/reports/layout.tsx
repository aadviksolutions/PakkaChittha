import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: 'Personal Khata Reports & Export | Pakka Chittha',
};

export default function FreeKhataReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


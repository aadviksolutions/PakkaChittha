import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Login | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


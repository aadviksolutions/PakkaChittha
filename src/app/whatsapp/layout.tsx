import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'WhatsApp Reminders | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function WhatsappLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


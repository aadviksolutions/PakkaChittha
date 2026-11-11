import type { Metadata } from 'next';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const metadata: Metadata = {
  title: 'Inventory & Stock | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


import type { Metadata } from 'next';
import { getCurrentSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { PlatformRole } from '@prisma/client';
import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';
import { NOINDEX_METADATA } from '@/lib/seo/constants';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Platform Admin | Pakka Chittha',
  ...NOINDEX_METADATA,
};

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login?redirect=/platform-admin');
  }

  // Strictly enforce that ONLY SUPER_ADMIN can access platform-admin routes
  if (session.user.platformRole !== PlatformRole.SUPER_ADMIN) {
    // Non-super-admin is bounced back to their business workspace
    redirect('/?error=forbidden_admin_access');
  }

  return (
    <AdminLayoutShell user={session.user}>
      {children}
    </AdminLayoutShell>
  );
}


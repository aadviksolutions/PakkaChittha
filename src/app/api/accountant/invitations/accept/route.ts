import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthError, requireAuth } from '@/lib/auth/guards';
import { getBusinessEntitlements } from '@/lib/subscription/entitlements';
import { acceptAccountantInvitation } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const rawToken = typeof body?.token === 'string' ? body.token.trim() : undefined;
    const invitationId =
      typeof body?.invitationId === 'string' ? body.invitationId.trim() : undefined;

    if (!rawToken && !invitationId) {
      return NextResponse.json(
        { error: 'Invitation token or invitationId is required' },
        { status: 400 }
      );
    }

    const result = await acceptAccountantInvitation({
      rawToken,
      invitationId,
      acceptingUserId: session.user.id,
      acceptingUserEmail: session.user.email,
      acceptingUserName: session.user.name,
      maxStaffSeatsResolver: async (businessId: string) => {
        const entitlements = await getBusinessEntitlements(businessId);
        if (!entitlements.entitlements.canAccountantErp) {
          throw new AuthError(
            'The inviting business must hold an active Scale plan for Accountant Workspace access.',
            403
          );
        }
        return entitlements.limits.maxUsers;
      },
    });

    // Switch session to the newly accepted business when requested or if user had no active business
    if (body?.switchToBusiness !== false || !session.activeBusiness) {
      await prisma.session.update({
        where: { id: session.sessionId },
        data: { businessId: result.business.id },
      });
    }

    return NextResponse.json({
      success: true,
      business: result.business,
      access: result.access,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to accept invitation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


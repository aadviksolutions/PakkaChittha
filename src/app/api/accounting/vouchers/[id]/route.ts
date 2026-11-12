import { NextRequest, NextResponse } from 'next/server';
import { VoucherStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS, recordAuditEvent } from '@/lib/rbac';
import {
  VoucherAlreadyPostedError,
  VoucherImbalanceError,
  VoucherNotFoundError,
  VoucherValidationError,
  cancelVoucher,
  postExistingDraftVoucher,
  validateVoucherBalance,
} from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VIEW
    );

    const voucher = await prisma.voucher.findFirst({
      where: { id, businessId: business.id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        reversalOf: { select: { id: true, voucherNumber: true, voucherType: true } },
        reversals: { select: { id: true, voucherNumber: true, voucherType: true } },
        entries: {
          include: {
            ledger: {
              select: {
                id: true,
                name: true,
                code: true,
                group: { select: { id: true, name: true, type: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      voucher: {
        ...voucher,
        voucherDate: voucher.voucherDate.toISOString().slice(0, 10),
        totalAmount: voucher.totalAmount.toFixed(2),
        entries: voucher.entries.map((e) => ({
          ...e,
          debitAmount: e.debitAmount.toFixed(2),
          creditAmount: e.creditAmount.toFixed(2),
        })),
      },
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/accounting/vouchers/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to load voucher.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const requestedBusinessId =
      typeof body?.businessId === 'string' ? body.businessId : undefined;

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VOUCHER_WRITE,
      ['BUSINESS_OWNER', 'OWNER', 'ACCOUNTANT', 'MANAGER']
    );

    const existing = await prisma.voucher.findFirst({
      where: { id, businessId: business.id },
      include: { entries: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Voucher not found.' }, { status: 404 });
    }

    if (existing.status !== VoucherStatus.DRAFT) {
      return NextResponse.json(
        {
          error:
            'Only DRAFT vouchers can be modified. Posted entries require cancellation/reversal.',
        },
        { status: 409 }
      );
    }

    if (body?.action === 'POST') {
      const posted = await postExistingDraftVoucher(existing.id, business.id, session.user.id);
      return NextResponse.json({
        success: true,
        voucher: {
          ...posted,
          voucherDate: posted.voucherDate.toISOString().slice(0, 10),
          totalAmount: posted.totalAmount.toFixed(2),
        },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const newNarration =
        body?.narration !== undefined
          ? typeof body.narration === 'string'
            ? body.narration.trim() || null
            : null
          : existing.narration;

      const rawDate = body?.voucherDate ? new Date(body.voucherDate) : existing.voucherDate;
      if (Number.isNaN(rawDate.getTime())) {
        throw new VoucherValidationError('Invalid voucher date.');
      }

      if (Array.isArray(body?.entries)) {
        const entries = body.entries.map(
          (e: {
            ledgerId?: unknown;
            debitAmount?: unknown;
            creditAmount?: unknown;
            narration?: unknown;
          }) => ({
            ledgerId: typeof e.ledgerId === 'string' ? e.ledgerId : '',
            debitAmount: Number(e.debitAmount || 0),
            creditAmount: Number(e.creditAmount || 0),
            narration: typeof e.narration === 'string' ? e.narration : undefined,
          })
        );

        const { totalDebit, normalizedEntries } = validateVoucherBalance(entries);

        await tx.voucherEntry.deleteMany({ where: { voucherId: existing.id } });
        return tx.voucher.update({
          where: { id: existing.id },
          data: {
            narration: newNarration,
            voucherDate: rawDate,
            totalAmount: totalDebit,
            entries: { create: normalizedEntries },
          },
          include: {
            entries: {
              include: { ledger: { select: { id: true, name: true, code: true } } },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
      }

      return tx.voucher.update({
        where: { id: existing.id },
        data: { narration: newNarration, voucherDate: rawDate },
        include: {
          entries: {
            include: { ledger: { select: { id: true, name: true, code: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    await recordAuditEvent({
      businessId: business.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      actorRole: business.erpRole,
      action: 'VOUCHER_DRAFT_UPDATED',
      entityType: 'Voucher',
      entityId: updated.id,
    });

    return NextResponse.json({
      success: true,
      voucher: {
        ...updated,
        voucherDate: updated.voucherDate.toISOString().slice(0, 10),
        totalAmount: updated.totalAmount.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof VoucherImbalanceError || error instanceof VoucherValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof VoucherAlreadyPostedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[PATCH /api/accounting/vouchers/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to update voucher.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let reason: string | undefined;
    let requestedBusinessId: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.reason === 'string') reason = body.reason;
      if (typeof body?.businessId === 'string') requestedBusinessId = body.businessId;
    } catch {
      // Optional JSON body
    }

    const { business, session } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.ACCOUNTING_VOUCHER_WRITE,
      ['BUSINESS_OWNER', 'OWNER']
    );

    const cancelled = await cancelVoucher(id, session.user.id, reason, business.id);

    return NextResponse.json({
      success: true,
      voucher: {
        ...cancelled,
        voucherDate: cancelled.voucherDate.toISOString().slice(0, 10),
        totalAmount: cancelled.totalAmount.toFixed(2),
      },
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof VoucherNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof VoucherAlreadyPostedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[DELETE /api/accounting/vouchers/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to cancel voucher.' }, { status: 500 });
  }
}


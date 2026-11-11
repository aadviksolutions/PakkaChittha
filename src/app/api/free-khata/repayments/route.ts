import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import {
  recordKhataRepayment,
  round2,
} from '@/lib/services/khataService';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    const result = await recordKhataRepayment(business.id, session.user.id, body);

    return NextResponse.json(
      {
        success: true,
        repayment: result.repayment,
        transaction: result.transaction,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record repayment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);
    const repaymentId = searchParams.get('id');

    if (!repaymentId) {
      return NextResponse.json(
        { success: false, error: 'Repayment ID is required.' },
        { status: 400 }
      );
    }

    const repayment = await prisma.khataRepayment.findFirst({
      where: { id: repaymentId, businessId: business.id },
      include: { transaction: true },
    });

    if (!repayment) {
      return NextResponse.json(
        { success: false, error: 'Repayment not found or access denied.' },
        { status: 404 }
      );
    }

    const tx = repayment.transaction;
    const newSettledAmount = Math.max(0, round2(tx.settledAmount - repayment.amount));
    const newBalanceAmount = round2(tx.amount - newSettledAmount);
    const newStatus =
      newBalanceAmount === 0 ? 'SETTLED' : newSettledAmount > 0 ? 'PARTIAL' : 'PENDING';

    await prisma.$transaction([
      prisma.khataRepayment.delete({ where: { id: repaymentId } }),
      prisma.khataTransaction.update({
        where: { id: tx.id },
        data: {
          settledAmount: newSettledAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Repayment deleted and transaction balance restored.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete repayment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const body = await req.json();
    const { id, amount, date, paymentMode, paymentRef, paymentDetails, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Repayment ID is required.' },
        { status: 400 }
      );
    }

    const repayment = await prisma.khataRepayment.findFirst({
      where: { id, businessId: business.id },
      include: { transaction: true },
    });

    if (!repayment) {
      return NextResponse.json(
        { success: false, error: 'Repayment not found or access denied.' },
        { status: 404 }
      );
    }

    const newAmount = amount !== undefined ? round2(Number(amount)) : repayment.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Repayment amount must be greater than zero.' },
        { status: 400 }
      );
    }

    const tx = repayment.transaction;
    const otherSettled = Math.max(0, round2(tx.settledAmount - repayment.amount));
    const newSettledAmount = round2(otherSettled + newAmount);

    if (newSettledAmount > round2(tx.amount)) {
      return NextResponse.json(
        {
          success: false,
          error: `Total settled (₹${newSettledAmount}) cannot exceed original transaction amount (₹${tx.amount}).`,
        },
        { status: 400 }
      );
    }

    const newBalanceAmount = Math.max(0, round2(tx.amount - newSettledAmount));
    const newStatus =
      newBalanceAmount === 0 ? 'SETTLED' : newSettledAmount > 0 ? 'PARTIAL' : 'PENDING';

    const [updatedRepayment, updatedTx] = await prisma.$transaction([
      prisma.khataRepayment.update({
        where: { id },
        data: {
          amount: newAmount,
          ...(date !== undefined ? { date: new Date(date) } : {}),
          ...(paymentMode !== undefined ? { paymentMode } : {}),
          ...(paymentRef !== undefined ? { paymentRef: paymentRef || null } : {}),
          ...(paymentDetails !== undefined ? { paymentDetails: paymentDetails || null } : {}),
          ...(notes !== undefined ? { notes: notes || null } : {}),
        },
      }),
      prisma.khataTransaction.update({
        where: { id: tx.id },
        data: {
          settledAmount: newSettledAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { repayment: updatedRepayment, transaction: updatedTx },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update repayment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

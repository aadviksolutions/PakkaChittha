import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireCommercialAccess } from '@/lib/auth/guards';
import { PaymentMethod } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireCommercialAccess();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = {
      businessId: authContext.business.id,
    };

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search && search.trim()) {
      where.OR = [
        { notes: { contains: search.trim(), mode: 'insensitive' } },
        { payee: { contains: search.trim(), mode: 'insensitive' } },
        { referenceNumber: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        ...e,
        description: e.notes,
      })),
      summary: {
        totalAmount,
        count: expenses.length,
      },
    });
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('Unauthorized') || error.message?.includes('Authentication') ? 401 : error.message?.includes('Commercial') ? 403 : 500);
    return NextResponse.json(
      { error: error.message || 'Unauthorized or failed to fetch expenses' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireCommercialAccess(undefined, ['BUSINESS_OWNER', 'ACCOUNTANT']);
    const body = await request.json();

    const { category, payee, description, amount, paymentMethod, expenseDate, referenceNumber } = body;

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid expense amount is required' }, { status: 400 });
    }

    const validPaymentMethod = Object.values(PaymentMethod).includes(paymentMethod)
      ? paymentMethod
      : PaymentMethod.CASH;

    const expense = await prisma.expense.create({
      data: {
        businessId: authContext.business.id,
        category: category.trim(),
        payee: payee?.trim() || 'General Outlay',
        notes: description?.trim() || null,
        amount: parsedAmount,
        paymentMethod: validPaymentMethod,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        referenceNumber: referenceNumber?.trim() || null,
      },
    });

    return NextResponse.json({ expense: { ...expense, description: expense.notes } }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('Unauthorized') || error.message?.includes('Authentication') ? 401 : error.message?.includes('Commercial') ? 403 : 500);
    return NextResponse.json(
      { error: error.message || 'Failed to record expense' },
      { status }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await requireCommercialAccess(undefined, ['BUSINESS_OWNER', 'ACCOUNTANT']);
    const body = await request.json();

    const { id, category, payee, description, amount, paymentMethod, expenseDate, referenceNumber } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, businessId: authContext.business.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found or unauthorized' }, { status: 404 });
    }

    if (category !== undefined && !category.trim()) {
      return NextResponse.json({ error: 'Expense category cannot be empty' }, { status: 400 });
    }

    const parsedAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid expense amount is required' }, { status: 400 });
    }

    const validPaymentMethod = paymentMethod
      ? Object.values(PaymentMethod).includes(paymentMethod)
        ? paymentMethod
        : existing.paymentMethod
      : existing.paymentMethod;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        category: category !== undefined ? category.trim() : existing.category,
        payee: payee !== undefined ? (payee?.trim() || 'General Outlay') : existing.payee,
        notes: description !== undefined ? (description?.trim() || null) : existing.notes,
        amount: parsedAmount,
        paymentMethod: validPaymentMethod,
        expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
        referenceNumber:
          referenceNumber !== undefined ? (referenceNumber?.trim() || null) : existing.referenceNumber,
      },
    });

    return NextResponse.json({ expense: { ...updated, description: updated.notes } });
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('Unauthorized') || error.message?.includes('Authentication') ? 401 : error.message?.includes('Commercial') ? 403 : 500);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await requireCommercialAccess(undefined, ['BUSINESS_OWNER', 'ACCOUNTANT']);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, businessId: authContext.business.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found or unauthorized' }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('Unauthorized') || error.message?.includes('Authentication') ? 401 : error.message?.includes('Commercial') ? 403 : 500);
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status }
    );
  }
}

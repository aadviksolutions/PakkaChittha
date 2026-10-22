import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import {
  getHouseholdTransactions,
  createHouseholdTransaction,
} from '@/lib/household/householdService';
import { HouseholdRole, HouseholdTransactionType, PaymentMethod } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdIdParam = searchParams.get('householdId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const month = searchParams.get('month') || undefined;
    const typeParam = searchParams.get('type') as HouseholdTransactionType | null;
    const categoryId = searchParams.get('categoryId') || undefined;
    const subcategory = searchParams.get('subcategory') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const memberId = searchParams.get('memberId') || undefined;
    const billType = searchParams.get('billType') || undefined;
    const isSharedParam = searchParams.get('isShared');
    const isShared = isSharedParam === 'true' ? true : isSharedParam === 'false' ? false : 'ALL';

    const authContext = await requireHouseholdAccess(householdIdParam);

    const result = await getHouseholdTransactions(authContext.householdId, {
      startDate,
      endDate,
      month,
      type: typeParam || undefined,
      categoryId,
      subcategory,
      search,
      page,
      pageSize,
      memberId,
      billType,
      isShared,
    });

    return NextResponse.json({
      success: true,
      authContext: {
        role: authContext.role,
        householdId: authContext.householdId,
      },
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      householdId,
      type,
      amount,
      categoryId,
      categoryName,
      subcategory,
      date,
      paymentMethod,
      description,
      payeeMerchant,
      notes,
      paidByMemberId,
      paidByName,
      isShared,
      splitType,
      splits,
      contributions,
      billType,
      billProvider,
      billConsumerId,
      billPeriod,
      billDueDate,
      billReferenceNo,
    } = body;

    // Viewers cannot create transactions
    const authContext = await requireHouseholdAccess(householdId, [
      HouseholdRole.OWNER,
      HouseholdRole.ADMIN,
      HouseholdRole.MEMBER,
    ]);

    const transaction = await createHouseholdTransaction(
      authContext.householdId,
      authContext.userId,
      {
        type,
        amount: Number(amount),
        categoryId,
        categoryName,
        subcategory,
        date,
        paymentMethod: paymentMethod as PaymentMethod,
        description,
        payeeMerchant,
        notes,
        paidByMemberId,
        paidByName,
        isShared: Boolean(isShared),
        splitType,
        splits,
        contributions,
        billType,
        billProvider,
        billConsumerId,
        billPeriod,
        billDueDate,
        billReferenceNo,
      }
    );

    return NextResponse.json({
      success: true,
      transaction,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record transaction.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

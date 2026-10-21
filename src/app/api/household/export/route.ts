import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import { exportTransactionsCsv } from '@/lib/household/householdService';
import { HouseholdTransactionType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const typeParam = searchParams.get('type') as HouseholdTransactionType | null;
    const categoryId = searchParams.get('categoryId') || undefined;
    const search = searchParams.get('search') || undefined;

    const authContext = await requireHouseholdAccess(householdId);

    const csvContent = await exportTransactionsCsv(authContext.householdId, {
      startDate,
      endDate,
      type: typeParam || undefined,
      categoryId,
      search,
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = authContext.householdName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${safeName}_transactions_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export CSV.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

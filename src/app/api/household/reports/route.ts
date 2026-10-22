import { NextRequest, NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/household/guards';
import { getHouseholdReports } from '@/lib/household/householdService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const householdIdParam = searchParams.get('householdId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const month = searchParams.get('month') || undefined;
    const year = searchParams.get('year') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const subcategory = searchParams.get('subcategory') || undefined;
    const memberId = searchParams.get('memberId') || undefined;
    const billType = searchParams.get('billType') || undefined;
    const search = searchParams.get('search') || undefined;
    const isSharedParam = searchParams.get('isShared');
    const isShared = isSharedParam === 'true' ? true : isSharedParam === 'false' ? false : 'ALL';

    const authContext = await requireHouseholdAccess(householdIdParam);

    const reportsData = await getHouseholdReports(authContext.householdId, {
      startDate,
      endDate,
      month,
      year,
      categoryId,
      subcategory,
      memberId,
      billType,
      search,
      isShared,
    });

    return NextResponse.json({
      success: true,
      authContext: {
        role: authContext.role,
        householdId: authContext.householdId,
        userName: authContext.userName,
      },
      ...reportsData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate household reports.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { getSuppliers, createSupplier } from '@/lib/services/supplierService';
import { checkFeatureEntitlement } from '@/lib/subscription/entitlements';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireGrowthAccess();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || undefined;

    const suppliers = await getSuppliers(business.id, query);

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch suppliers.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Feature not available') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireGrowthAccess();

    const entitlement = await checkFeatureEntitlement(business.id, 'canManageSuppliers');
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: entitlement.message || 'Supplier management requires Pakka Chittha Growth or Scale plan.',
          upgradeRequired: true,
          requiredPlan: entitlement.requiredPlan,
          planName: entitlement.planName,
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const supplier = await createSupplier(business.id, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      gstin: body.gstin,
      openingBalance: body.openingBalance,
      notes: body.notes,
    });

    return NextResponse.json(
      {
        success: true,
        supplier,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create supplier.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

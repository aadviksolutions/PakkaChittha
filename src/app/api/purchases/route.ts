import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { getPurchases, createPurchase } from '@/lib/services/purchaseService';
import { checkFeatureEntitlement } from '@/lib/subscription/entitlements';
import { PurchaseStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireGrowthAccess();
    const { searchParams } = new URL(req.url);

    const supplierId = searchParams.get('supplierId') || undefined;
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam as PurchaseStatus) : undefined;
    const query = searchParams.get('query') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const purchases = await getPurchases(business.id, {
      supplierId,
      status,
      query,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      purchases,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch purchases.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Feature not available') || message.includes('Commercial plan required') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireGrowthAccess();

    const entitlement = await checkFeatureEntitlement(business.id, 'canManagePurchases');
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: entitlement.message || 'Purchases require Pakka Chittha Growth or Scale plan.',
          upgradeRequired: true,
          requiredPlan: entitlement.requiredPlan,
          planName: entitlement.planName,
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    const purchase = await createPurchase(
      business.id,
      {
        supplierId: body.supplierId,
        supplierInvoiceNumber: body.supplierInvoiceNumber,
        purchaseDate: body.purchaseDate,
        dueDate: body.dueDate,
        status: body.status,
        items: body.items,
        paidAmount: body.paidAmount,
        paymentMethod: body.paymentMethod,
        paymentReference: body.paymentReference,
        notes: body.notes,
      },
      session.user.name || 'Staff'
    );

    return NextResponse.json(
      {
        success: true,
        purchase,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

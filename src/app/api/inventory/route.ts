import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess } from '@/lib/auth/guards';
import {
  getProducts,
  createProduct,
  getInventoryValuation,
} from '@/lib/services/inventoryService';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireCommercialAccess();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get('query') || undefined;
    const category = searchParams.get('category') || undefined;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const [products, valuation] = await Promise.all([
      getProducts(business.id, { query, category, lowStockOnly, includeArchived }),
      getInventoryValuation(business.id),
    ]);

    return NextResponse.json({
      success: true,
      products,
      valuation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') || message.includes('Commercial plan required') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireCommercialAccess();
    const body = await req.json();

    const product = await createProduct(
      business.id,
      {
        name: body.name,
        sku: body.sku,
        barcode: body.barcode,
        category: body.category,
        unit: body.unit,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        taxRate: body.taxRate,
        openingStock: body.openingStock,
        lowStockAlert: body.lowStockAlert,
        description: body.description,
        imageUrl: body.imageUrl,
      },
      session.user.name || 'User'
    );

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create product.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import {
  getProductById,
  updateProduct,
  archiveProduct,
} from '@/lib/services/inventoryService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;

    const product = await getProductById(business.id, id);

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch product.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireCommercialAccess();
    const { id } = await params;
    const body = await req.json();

    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      const archived = await archiveProduct(business.id, id, Boolean(body.isActive));
      return NextResponse.json({ success: true, product: archived });
    }

    const updated = await updateProduct(business.id, id, {
      name: body.name,
      sku: body.sku,
      barcode: body.barcode,
      category: body.category,
      unit: body.unit,
      purchasePrice: body.purchasePrice,
      sellingPrice: body.sellingPrice,
      taxRate: body.taxRate,
      lowStockAlert: body.lowStockAlert,
      description: body.description,
      imageUrl: body.imageUrl,
    });

    return NextResponse.json({
      success: true,
      product: updated,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update product.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminUpdateCategory, adminDeleteCategory } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const category = await adminUpdateCategory(id, body);
    return NextResponse.json({ success: true, category });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update category';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const reassignCategoryId = searchParams.get('reassignCategoryId') || undefined;

    const result = await adminDeleteCategory(id, reassignCategoryId);
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


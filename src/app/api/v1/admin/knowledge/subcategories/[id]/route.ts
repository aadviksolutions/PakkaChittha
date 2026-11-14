import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminUpdateSubcategory, adminDeleteSubcategory } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const subcategory = await adminUpdateSubcategory(id, body);
    return NextResponse.json({ success: true, subcategory });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update subcategory';
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
    await adminDeleteSubcategory(id);
    return NextResponse.json({ success: true, message: 'Subcategory deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete subcategory';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


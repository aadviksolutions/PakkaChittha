import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminCreateSubcategory } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const subcategory = await adminCreateSubcategory(body);
    return NextResponse.json({ success: true, subcategory }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create subcategory';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


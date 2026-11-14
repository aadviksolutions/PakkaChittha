import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminGetCategories, adminCreateCategory } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const categories = await adminGetCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Access denied';
    const status = message.includes('Authentication') ? 401 : message.includes('privileges') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const category = await adminCreateCategory(body);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create category';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


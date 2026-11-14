import { NextRequest, NextResponse } from 'next/server';
import { getPublicCategories } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const categories = await getPublicCategories();
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


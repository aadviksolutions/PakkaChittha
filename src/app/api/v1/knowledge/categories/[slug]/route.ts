import { NextRequest, NextResponse } from 'next/server';
import { getPublicCategoryBySlug } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const category = await getPublicCategoryBySlug(slug);

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch category';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


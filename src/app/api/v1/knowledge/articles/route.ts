import { NextRequest, NextResponse } from 'next/server';
import { getPublicArticles } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category') || undefined;
    const subcategorySlug = searchParams.get('subcategory') || undefined;
    const search = searchParams.get('search') || undefined;
    const language = searchParams.get('lang') || undefined;
    const sort = (searchParams.get('sort') as any) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10);

    const result = await getPublicArticles({
      categorySlug,
      subcategorySlug,
      search,
      language,
      sort,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch articles';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


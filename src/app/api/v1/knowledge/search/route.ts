import { NextRequest, NextResponse } from 'next/server';
import { globalKnowledgeSearch } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const language = searchParams.get('lang') || undefined;
    const type = (searchParams.get('type') as any) || 'all';
    const categorySlug = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    const results = await globalKnowledgeSearch({
      query,
      language,
      type,
      categorySlug,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


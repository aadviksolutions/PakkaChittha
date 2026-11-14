import { NextRequest, NextResponse } from 'next/server';
import { getPublicArticleBySlug, incrementKnowledgeView } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const article = await getPublicArticleBySlug(slug);

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Increment view count asynchronously in background
    incrementKnowledgeView({ articleId: article.id }).catch(() => {});

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch article';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getPublicQuestionBySlug, incrementKnowledgeView } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const question = await getPublicQuestionBySlug(slug);

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    // Increment view count asynchronously in background
    incrementKnowledgeView({ questionId: question.id }).catch(() => {});

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch question';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


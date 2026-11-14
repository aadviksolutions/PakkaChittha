import { NextRequest, NextResponse } from 'next/server';
import { recordFeedback } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';

    const feedback = await recordFeedback({
      questionId: body.questionId,
      articleId: body.articleId,
      isHelpful: Boolean(body.isHelpful),
      feedbackText: body.feedbackText,
      ipHash: forwardedFor.split(',')[0].trim(),
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Feedback recording failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


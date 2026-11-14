import { NextRequest, NextResponse } from 'next/server';
import { submitUserQuestion } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';

    const submission = await submitUserQuestion({
      name: body.name,
      email: body.email,
      question: body.question,
      categoryId: body.categoryId,
      preferredLang: body.preferredLang,
      ipHash: forwardedFor.split(',')[0].trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'आपका सवाल सफलतापूर्वक दर्ज कर लिया गया है। समीक्षा के बाद इसे प्रकाशित किया जाएगा।',
        submissionId: submission.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'सवाल दर्ज करने में विफल रहे।';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


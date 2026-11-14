import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminReviewSubmission } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const submission = await adminReviewSubmission(id, body);
    return NextResponse.json({ success: true, submission });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update submission';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


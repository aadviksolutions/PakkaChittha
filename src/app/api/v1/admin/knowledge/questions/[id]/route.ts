import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminUpdateQuestion, adminDeleteQuestion } from '@/lib/services/knowledgeService';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const question = await prisma.khQuestion.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
      },
    });

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, question });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Access denied';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const question = await adminUpdateQuestion(id, body);
    return NextResponse.json({ success: true, question });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update question';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    await adminDeleteQuestion(id);
    return NextResponse.json({ success: true, message: 'Question deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete question';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


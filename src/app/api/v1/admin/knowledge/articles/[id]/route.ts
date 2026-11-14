import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminUpdateArticle, adminDeleteArticle } from '@/lib/services/knowledgeService';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const article = await prisma.khArticle.findUnique({
      where: { id },
      include: {
        category: true,
        subcategory: true,
      },
    });

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, article });
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
    const article = await adminUpdateArticle(id, body);
    return NextResponse.json({ success: true, article });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update article';
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
    await adminDeleteArticle(id);
    return NextResponse.json({ success: true, message: 'Article deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete article';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}


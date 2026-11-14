import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminGetSubmissions } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as any) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await adminGetSubmissions({ status, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Access denied';
    const status = message.includes('Authentication') ? 401 : message.includes('privileges') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}


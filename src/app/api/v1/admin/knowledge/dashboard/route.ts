import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { adminGetKnowledgeDashboardMetrics } from '@/lib/services/knowledgeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const data = await adminGetKnowledgeDashboardMetrics();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Access denied';
    const status = message.includes('Authentication') ? 401 : message.includes('privileges') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}


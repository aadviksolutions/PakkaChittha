import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import { executeVoiceTransaction } from '@/lib/services/voiceTransactionService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { business, session } = await requireTenantAccess();
    const body = await req.json();

    if (!body || !body.type || !body.amount) {
      return NextResponse.json(
        { success: false, error: 'Transaction type and valid amount are required.' },
        { status: 400 }
      );
    }

    const result = await executeVoiceTransaction(business.id, session.user.id, body);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record voice transaction.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import { lookupGstinDetails, validateGstinFormat } from '@/lib/services/gstinService';

/**
 * GET /api/gstin/lookup?gstin=...
 * Shared authenticated GSTIN lookup endpoint for both Website and Android App.
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);
    const gstin = searchParams.get('gstin');

    if (!gstin) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "gstin" is required.', code: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    const result = await lookupGstinDetails(gstin, business.id);

    if (!result.success) {
      const statusCode =
        result.code === 'INVALID_FORMAT'
          ? 400
          : result.code === 'RATE_LIMITED'
          ? 429
          : result.code === 'NOT_FOUND'
          ? 404
          : result.code === 'TIMEOUT'
          ? 504
          : 502;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'UNAUTHORIZED' },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to lookup GST details.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message, code: 'UNAUTHORIZED' },
      { status }
    );
  }
}

/**
 * POST /api/gstin/lookup
 * Alternative POST endpoint accepting JSON payload { gstin: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const body = await req.json().catch(() => ({}));
    const gstin = body.gstin;

    if (!gstin || typeof gstin !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Field "gstin" is required in request body.', code: 'INVALID_FORMAT' },
        { status: 400 }
      );
    }

    const result = await lookupGstinDetails(gstin, business.id);

    if (!result.success) {
      const statusCode =
        result.code === 'INVALID_FORMAT'
          ? 400
          : result.code === 'RATE_LIMITED'
          ? 429
          : result.code === 'NOT_FOUND'
          ? 404
          : result.code === 'TIMEOUT'
          ? 504
          : 502;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'UNAUTHORIZED' },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to lookup GST details.';
    const status = message.includes('Authentication') ? 401 : message.includes('Access Denied') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message, code: 'UNAUTHORIZED' },
      { status }
    );
  }
}

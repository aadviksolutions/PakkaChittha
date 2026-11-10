import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const businessId = session.activeBusiness?.id;

    // Check user payment details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        upiId: true,
        upiQrImageUrl: true,
        upiBeneficiaryName: true,
      },
    });

    // Check business payment details if available
    let business = null;
    if (businessId) {
      business = await prisma.business.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          bankUpiId: true,
          upiQrImageUrl: true,
          upiBeneficiaryName: true,
        },
      });
    }

    const upiId = business?.bankUpiId || user?.upiId || null;
    const upiQrImageUrl = business?.upiQrImageUrl || user?.upiQrImageUrl || null;
    const upiBeneficiaryName = business?.upiBeneficiaryName || user?.upiBeneficiaryName || null;

    return NextResponse.json({
      success: true,
      paymentDetails: {
        upiId,
        upiQrImageUrl,
        upiBeneficiaryName,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const businessId = session.activeBusiness?.id;

    const contentType = request.headers.get('content-type') || '';
    let upiId: string | null = null;
    let upiBeneficiaryName: string | null = null;
    let upiQrImageUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('qrImage') as File | null;
      upiId = (formData.get('upiId') as string)?.trim() || null;
      upiBeneficiaryName = (formData.get('upiBeneficiaryName') as string)?.trim() || null;

      if (file && file.size > 0) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: 'Invalid file format. Please upload a PNG or JPEG image of your UPI QR code.' },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'File size exceeds 3 MB limit. Please upload a smaller image.' },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        upiQrImageUrl = `data:${file.type};base64,${base64}`;

        // Also save to disk
        try {
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'upi-qr');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const ext = file.type.includes('png') ? 'png' : 'jpg';
          const fileName = `qr_${userId}.${ext}`;
          fs.writeFileSync(path.join(uploadDir, fileName), buffer);
        } catch (fsErr) {
          console.warn('Could not save QR file to disk, using data URL:', fsErr);
        }
      }
    } else {
      const body = await request.json();
      upiId = body.upiId ? String(body.upiId).trim() : null;
      upiBeneficiaryName = body.upiBeneficiaryName ? String(body.upiBeneficiaryName).trim() : null;
      upiQrImageUrl = body.upiQrImageUrl ? String(body.upiQrImageUrl) : null;
    }

    // Update User
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(upiId !== null ? { upiId } : {}),
        ...(upiBeneficiaryName !== null ? { upiBeneficiaryName } : {}),
        ...(upiQrImageUrl !== undefined ? { upiQrImageUrl } : {}),
      },
    });

    // Update Business if active
    if (businessId) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          ...(upiId !== null ? { bankUpiId: upiId } : {}),
          ...(upiBeneficiaryName !== null ? { upiBeneficiaryName } : {}),
          ...(upiQrImageUrl !== undefined ? { upiQrImageUrl } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment details saved successfully!',
      paymentDetails: {
        upiId,
        upiBeneficiaryName,
        upiQrImageUrl,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const businessId = session.activeBusiness?.id;

    await prisma.user.update({
      where: { id: userId },
      data: { upiQrImageUrl: null },
    });

    if (businessId) {
      await prisma.business.update({
        where: { id: businessId },
        data: { upiQrImageUrl: null },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Saved UPI QR code removed.',
      upiQrImageUrl: null,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

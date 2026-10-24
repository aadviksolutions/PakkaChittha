import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { checkFeatureEntitlement } from '@/lib/subscription/entitlements';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parsePurchaseBillBuffer } from '@/lib/ocr/purchaseBillParser';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const { business } = await requireCommercialAccess();

    // 1. Server-side entitlement check: Highest Plan Only
    const entitlement = await checkFeatureEntitlement(business.id, 'canScanPurchaseBills');
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            entitlement.message ||
            'Purchase bill scanning and automatic OCR import are exclusively available on Pakka Chittha Scale (highest plan). Please upgrade to unlock OCR bill scanning.',
          upgradeRequired: true,
          requiredPlan: 'SCALE',
          planName: 'Pakka Chittha Scale',
        },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer;
    let originalName = 'bill.jpg';
    let mimeType = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No bill image file provided.' },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported file format. Please upload PNG, JPG, WebP, or PDF.',
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds 5 MB. Please upload a compressed bill image.' },
          { status: 400 }
        );
      }

      originalName = file.name;
      mimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // JSON Base64 or Image URL
      const body = await request.json();
      const dataUrl = body.imageUrl || body.dataUrl;

      if (!dataUrl) {
        return NextResponse.json(
          { success: false, error: 'No image data provided in request.' },
          { status: 400 }
        );
      }

      const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl);
      }
    }

    // 2. Save bill image securely on server
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const safeId = crypto.randomBytes(10).toString('hex');
    const fileName = `bill_${business.id.slice(-6)}_${Date.now()}_${safeId}.${ext}`;
    let scannedBillUrl = '';

    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'bills');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      scannedBillUrl = `/uploads/bills/${fileName}`;
    } catch (saveErr) {
      console.warn('Local disk save skipped, using data URL fallback:', saveErr);
      scannedBillUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    // 3. Perform OCR & Heuristic Bill Analysis
    const analysis = await parsePurchaseBillBuffer(buffer, originalName);

    // 4. Duplicate Bill Detection Safeguard
    let isPossibleDuplicate = false;
    let duplicateMessage: string | null = null;

    if (analysis.invoiceNumber) {
      const existingPurchase = await prisma.purchase.findFirst({
        where: {
          businessId: business.id,
          supplierInvoiceNumber: {
            equals: analysis.invoiceNumber,
            mode: 'insensitive',
          },
        },
        include: { supplier: true },
      });

      if (existingPurchase) {
        isPossibleDuplicate = true;
        duplicateMessage = `A purchase bill with invoice number "${analysis.invoiceNumber}" from supplier "${existingPurchase.supplier.name}" already exists in your records (Purchase #${existingPurchase.purchaseNumber}).`;
      }
    }

    return NextResponse.json({
      success: true,
      scannedBillUrl,
      analysis,
      isPossibleDuplicate,
      duplicateMessage,
      message: 'Bill scanned and analyzed successfully. Please review and confirm before importing to inventory.',
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to scan purchase bill.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

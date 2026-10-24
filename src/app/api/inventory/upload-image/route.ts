import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { checkFeatureEntitlement } from '@/lib/subscription/entitlements';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(request: NextRequest) {
  try {
    const { business } = await requireCommercialAccess();

    // 1. Strict Server-Side Entitlement Check: Highest Plan Only
    const entitlement = await checkFeatureEntitlement(business.id, 'canUploadProductImages');
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            entitlement.message ||
            'Product image uploads are exclusively available on the highest plan (Pakka Chittha Scale). Please upgrade to unlock product photos.',
          upgradeRequired: true,
          requiredPlan: 'SCALE',
          planName: 'Pakka Chittha Scale',
        },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let finalImageUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const productId = formData.get('productId') as string | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No image file provided in request.' },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported image format. Allowed formats: PNG, JPEG, JPG, WebP.',
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds 3 MB limit. Please compress the image.' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Safe randomized file name
      const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const safeId = crypto.randomBytes(12).toString('hex');
      const fileName = `prod_${business.id.slice(-6)}_${Date.now()}_${safeId}.${ext}`;

      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        finalImageUrl = `/uploads/products/${fileName}`;
      } catch (fsErr) {
        console.warn('Local static disk save skipped, falling back to base64 data URL:', fsErr);
        const base64 = buffer.toString('base64');
        finalImageUrl = `data:${file.type};base64,${base64}`;
      }

      // If productId was passed, associate with product in database
      if (productId) {
        const product = await prisma.product.findFirst({
          where: { id: productId, businessId: business.id },
        });
        if (product) {
          await prisma.product.update({
            where: { id: productId },
            data: { imageUrl: finalImageUrl },
          });
        }
      }
    } else {
      // JSON payload containing existing URL or base64
      const body = await request.json();
      if (!body.imageUrl && !body.dataUrl) {
        return NextResponse.json(
          { success: false, error: 'No image payload provided.' },
          { status: 400 }
        );
      }
      finalImageUrl = body.imageUrl || body.dataUrl;

      if (body.productId) {
        await prisma.product.update({
          where: { id: body.productId },
          data: { imageUrl: finalImageUrl },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product image uploaded successfully!',
      imageUrl: finalImageUrl,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to upload product image.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

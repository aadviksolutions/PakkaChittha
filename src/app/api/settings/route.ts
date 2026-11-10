import { NextResponse } from 'next/server';
import { requireTenantAccess, AuthError } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { business } = await requireTenantAccess();

    const profile = await prisma.business.findUnique({
      where: { id: business.id },
      select: {
        id: true,
        name: true,
        legalName: true,
        tradeType: true,
        gstin: true,
        city: true,
        state: true,
        address: true,
        pincode: true,
        phone: true,
        email: true,
        currency: true,
        bankName: true,
        bankAccountNumber: true,
        bankIfsc: true,
        bankUpiId: true,
        upiQrImageUrl: true,
        upiBeneficiaryName: true,
        invoiceTerms: true,
        allowNegativeStock: true,
        logoUrl: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Business profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, business: profile });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { business } = await requireTenantAccess(undefined, ['BUSINESS_OWNER']);
    const body = await request.json();

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: body.name ? String(body.name).trim() : undefined,
        legalName: body.legalName ? String(body.legalName).trim() : null,
        tradeType: body.tradeType ? String(body.tradeType).trim() : null,
        gstin: body.gstin ? String(body.gstin).trim().toUpperCase() : null,
        city: body.city ? String(body.city).trim() : null,
        state: body.state ? String(body.state).trim() : null,
        address: body.address ? String(body.address).trim() : null,
        pincode: body.pincode ? String(body.pincode).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        bankName: body.bankName ? String(body.bankName).trim() : null,
        bankAccountNumber: body.bankAccountNumber ? String(body.bankAccountNumber).trim() : null,
        bankIfsc: body.bankIfsc ? String(body.bankIfsc).trim().toUpperCase() : null,
        bankUpiId: body.bankUpiId ? String(body.bankUpiId).trim() : null,
        upiBeneficiaryName: body.upiBeneficiaryName !== undefined ? (body.upiBeneficiaryName ? String(body.upiBeneficiaryName).trim() : null) : undefined,
        upiQrImageUrl: body.upiQrImageUrl !== undefined ? (body.upiQrImageUrl ? String(body.upiQrImageUrl) : null) : undefined,
        invoiceTerms: body.invoiceTerms ? String(body.invoiceTerms).trim() : null,
        allowNegativeStock: typeof body.allowNegativeStock === 'boolean' ? body.allowNegativeStock : undefined,
        logoUrl: body.logoUrl !== undefined ? (body.logoUrl ? String(body.logoUrl) : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, business: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    const message = error instanceof Error ? error.message : 'Failed to update business profile';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

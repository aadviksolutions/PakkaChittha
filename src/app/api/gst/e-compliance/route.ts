import { NextRequest, NextResponse } from 'next/server';
import { InvoiceStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  AuthError,
  TenantIsolationError,
  requireScaleErpAccess,
} from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/rbac';
import { buildEwayBillPayload, buildNicEinvoicePayload, isValidGstin } from '@/lib/gst';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBusinessId = searchParams.get('businessId') || undefined;
    const invoiceId = searchParams.get('invoiceId');
    const mode = searchParams.get('mode') || 'einvoice';
    const transDistanceKm = Number(searchParams.get('distanceKm') || 50);
    const vehicleNo = searchParams.get('vehicleNo') || '';
    const transporterName = searchParams.get('transporterName') || '';
    const transporterId = searchParams.get('transporterId') || '';

    const { business } = await requireScaleErpAccess(
      requestedBusinessId,
      PERMISSIONS.GST_VIEW
    );

    const bizProfile = await prisma.business.findUnique({
      where: { id: business.id },
      select: {
        id: true,
        name: true,
        legalName: true,
        gstin: true,
        address: true,
        city: true,
        pincode: true,
        state: true,
      },
    });

    if (!bizProfile) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
    }

    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, businessId: business.id },
        include: {
          items: true,
          customer: {
            select: {
              name: true,
              gstin: true,
              billingAddress: true,
            },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      const prepInput = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        isGstInvoice: invoice.isGstInvoice,
        gstType: invoice.gstType,
        subtotal: invoice.subtotal,
        cgstTotal: invoice.cgstTotal,
        sgstTotal: invoice.sgstTotal,
        igstTotal: invoice.igstTotal,
        discountTotal: invoice.discountTotal,
        rounding: invoice.rounding,
        total: invoice.total,
        supplier: bizProfile,
        buyer: {
          name: invoice.customerName,
          gstin: invoice.customerGstin || invoice.customer.gstin,
          billingAddress: invoice.customerBillingAddress || invoice.customer.billingAddress,
        },
        items: invoice.items,
      };

      const einvoice = buildNicEinvoicePayload(prepInput);
      const ewayBill = buildEwayBillPayload(prepInput, {
        transDistanceKm,
        vehicleNo,
        transporterName,
        transporterId,
      });

      if (searchParams.get('download') === 'true') {
        const chosen = mode === 'ewb' ? ewayBill : einvoice;
        if (!chosen.valid || !chosen.payload) {
          return NextResponse.json(
            {
              error: 'Payload failed strict NIC schema validation.',
              validationErrors: chosen.validationErrors,
            },
            { status: 400 }
          );
        }
        return new NextResponse(JSON.stringify(chosen.payload, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${mode.toUpperCase()}_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.json"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
          customerName: invoice.customerName,
          customerGstin: invoice.customerGstin || invoice.customer.gstin,
          total: invoice.total,
        },
        einvoice,
        ewayBill,
      });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId: business.id,
        status: { not: InvoiceStatus.CANCELLED },
        isGstInvoice: true,
      },
      orderBy: { invoiceDate: 'desc' },
      take: 60,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        customerGstin: true,
        total: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      businessGstinValid: isValidGstin(bizProfile.gstin),
      businessGstin: bizProfile.gstin,
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate.toISOString().slice(0, 10),
        customerName: i.customerName,
        customerGstin: i.customerGstin,
        total: i.total,
        b2bEligible: isValidGstin(i.customerGstin),
        ewbMandatoryThreshold: i.total > 50000,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof TenantIsolationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[GET /api/gst/e-compliance] Error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare E-Invoice / E-Way Bill compliance data.' },
      { status: 500 }
    );
  }
}

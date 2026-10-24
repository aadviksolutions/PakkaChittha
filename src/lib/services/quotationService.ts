import prisma from '@/lib/prisma';
import {
  calculateInvoiceTotals,
  LineItemInput,
  GstType,
  round2,
} from '@/lib/billing/calculator';
import { generateQuotationNumber } from '@/lib/billing/sequence';
import { QuotationStatus, InvoiceStatus } from '@prisma/client';
import { createInvoice } from './invoiceService';

export interface CreateQuotationInput {
  customerId: string;
  quotationDate?: string | Date;
  validUntil?: string | Date;
  gstType?: GstType;
  isTaxInclusive?: boolean;
  isGstInvoice?: boolean;
  items: LineItemInput[];
  notes?: string;
  termsAndConditions?: string;
  status?: QuotationStatus;
}

export interface UpdateQuotationInput {
  customerId?: string;
  quotationDate?: string | Date;
  validUntil?: string | Date;
  gstType?: GstType;
  isTaxInclusive?: boolean;
  isGstInvoice?: boolean;
  items?: LineItemInput[];
  notes?: string;
  termsAndConditions?: string;
  status?: QuotationStatus;
}

export interface QuotationFilters {
  search?: string;
  customerId?: string;
  status?: QuotationStatus;
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Creates a quotation with server-calculated totals, auto-sequence numbering,
 * customer & business branding snapshot. Available to all subscription tiers.
 */
export async function createQuotation(
  businessId: string,
  input: CreateQuotationInput
) {
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one line item is required to generate a quotation.');
  }

  // 1. Verify customer belongs to the active tenant
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, businessId },
  });

  if (!customer) {
    throw new Error('Selected customer does not exist in this business workspace.');
  }

  // 2. Fetch business profile for snapshot
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new Error('Active business workspace not found.');
  }

  // 3. Calculate financial totals on the server
  const gstType: GstType = input.gstType || 'CGST_SGST';
  const isTaxInclusive = Boolean(input.isTaxInclusive);
  const isGstInvoice = input.isGstInvoice !== false;

  const calc = calculateInvoiceTotals({
    items: input.items,
    gstType,
    isTaxInclusive,
    isGstInvoice,
    paidAmount: 0,
    enableRounding: true,
  });

  const quotationDate = input.quotationDate ? new Date(input.quotationDate) : new Date();
  const validUntil = input.validUntil
    ? new Date(input.validUntil)
    : new Date(quotationDate.getTime() + 30 * 86400000); // 30 days default validity

  const initialStatus = input.status || QuotationStatus.DRAFT;

  // 4. Atomic transaction for sequence & creation
  return prisma.$transaction(async (tx) => {
    const quotationNumber = await generateQuotationNumber(tx, businessId, 'QTN');

    const quotation = await tx.quotation.create({
      data: {
        businessId,
        customerId: customer.id,
        quotationNumber,
        quotationDate,
        validUntil,
        status: initialStatus,

        gstType,
        isTaxInclusive,
        isGstInvoice,

        subtotal: calc.subtotal,
        discountTotal: calc.discountTotal,
        taxTotal: calc.taxTotal,
        cgstTotal: calc.cgstTotal,
        sgstTotal: calc.sgstTotal,
        igstTotal: calc.igstTotal,
        rounding: calc.rounding,
        total: calc.total,

        customerName: customer.name,
        customerMobile: customer.mobile,
        customerGstin: customer.gstin || null,
        customerBillingAddress: customer.billingAddress || null,

        businessName: business.name,
        businessGstin: business.gstin || null,
        businessAddress: business.address || null,
        businessLogoUrl: business.logoUrl || null,

        notes: input.notes || null,
        termsAndConditions: input.termsAndConditions || business.invoiceTerms || null,

        items: {
          create: calc.items.map((item) => ({
            productId: item.productId || null,
            hsnCode: item.hsnCode || null,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'Pcs',
            rate: item.rate,
            discount: item.discount,
            discountType: item.discountType || 'AMOUNT',
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
            cgstRate: item.cgstRate,
            cgstAmount: item.cgstAmount,
            sgstRate: item.sgstRate,
            sgstAmount: item.sgstAmount,
            igstRate: item.igstRate,
            igstAmount: item.igstAmount,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return quotation;
  });
}

/**
 * Retrieves quotations for a business with search and status filters
 */
export async function getQuotations(businessId: string, filters?: QuotationFilters) {
  const where: any = { businessId };

  if (filters?.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const q = filters.search.trim();
    where.OR = [
      { quotationNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerMobile: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (filters?.startDate || filters?.endDate) {
    where.quotationDate = {};
    if (filters.startDate) where.quotationDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.quotationDate.lte = new Date(filters.endDate);
  }

  return prisma.quotation.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
        },
      },
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Retrieves a single quotation with full details
 */
export async function getQuotationById(businessId: string, id: string) {
  return prisma.quotation.findFirst({
    where: { id, businessId },
    include: {
      customer: true,
      business: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              sku: true,
              currentStock: true,
              unit: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Updates an existing quotation
 */
export async function updateQuotation(
  businessId: string,
  id: string,
  input: UpdateQuotationInput
) {
  const existing = await prisma.quotation.findFirst({
    where: { id, businessId },
    include: { items: true },
  });

  if (!existing) {
    throw new Error('Quotation not found.');
  }

  if (existing.status === QuotationStatus.CONVERTED) {
    throw new Error('Converted quotations cannot be modified.');
  }

  // If items or customer are updated, recalculate
  let customerName = existing.customerName;
  let customerMobile = existing.customerMobile;
  let customerGstin = existing.customerGstin;
  let customerBillingAddress = existing.customerBillingAddress;

  if (input.customerId && input.customerId !== existing.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, businessId },
    });
    if (!customer) throw new Error('Customer not found.');
    customerName = customer.name;
    customerMobile = customer.mobile;
    customerGstin = customer.gstin;
    customerBillingAddress = customer.billingAddress;
  }

  const gstType: GstType = input.gstType || existing.gstType;
  const isTaxInclusive = input.isTaxInclusive !== undefined ? input.isTaxInclusive : existing.isTaxInclusive;
  const isGstInvoice = input.isGstInvoice !== undefined ? input.isGstInvoice : existing.isGstInvoice;

  let calc = null;
  if (input.items && input.items.length > 0) {
    calc = calculateInvoiceTotals({
      items: input.items,
      gstType,
      isTaxInclusive,
      isGstInvoice,
      paidAmount: 0,
      enableRounding: true,
    });
  }

  return prisma.$transaction(async (tx) => {
    if (calc && input.items) {
      // Delete old items and insert updated items
      await tx.quotationItem.deleteMany({
        where: { quotationId: id },
      });

      await tx.quotationItem.createMany({
        data: calc.items.map((item) => ({
          quotationId: id,
          productId: item.productId || null,
          hsnCode: item.hsnCode || null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'Pcs',
          rate: item.rate,
          discount: item.discount,
          discountType: item.discountType || 'AMOUNT',
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          cgstRate: item.cgstRate,
          cgstAmount: item.cgstAmount,
          sgstRate: item.sgstRate,
          sgstAmount: item.sgstAmount,
          igstRate: item.igstRate,
          igstAmount: item.igstAmount,
          lineTotal: item.lineTotal,
        })),
      });
    }

    const updated = await tx.quotation.update({
      where: { id },
      data: {
        customerId: input.customerId || existing.customerId,
        customerName,
        customerMobile,
        customerGstin,
        customerBillingAddress,
        quotationDate: input.quotationDate ? new Date(input.quotationDate) : existing.quotationDate,
        validUntil: input.validUntil ? new Date(input.validUntil) : existing.validUntil,
        status: input.status || existing.status,
        gstType,
        isTaxInclusive,
        isGstInvoice,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        termsAndConditions: input.termsAndConditions !== undefined ? input.termsAndConditions : existing.termsAndConditions,
        ...(calc
          ? {
              subtotal: calc.subtotal,
              discountTotal: calc.discountTotal,
              taxTotal: calc.taxTotal,
              cgstTotal: calc.cgstTotal,
              sgstTotal: calc.sgstTotal,
              igstTotal: calc.igstTotal,
              rounding: calc.rounding,
              total: calc.total,
            }
          : {}),
      },
      include: {
        items: true,
        customer: true,
      },
    });

    return updated;
  });
}

/**
 * Deletes a quotation
 */
export async function deleteQuotation(businessId: string, id: string) {
  const existing = await prisma.quotation.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    throw new Error('Quotation not found.');
  }

  if (existing.status === QuotationStatus.CONVERTED) {
    throw new Error('Cannot delete a converted quotation.');
  }

  return prisma.quotation.delete({
    where: { id },
  });
}

/**
 * Converts a quotation into a commercial invoice atomically
 */
export async function convertQuotationToInvoice(
  businessId: string,
  userId: string,
  quotationId: string
) {
  const quotation = await getQuotationById(businessId, quotationId);

  if (!quotation) {
    throw new Error('Quotation not found.');
  }

  if (quotation.status === QuotationStatus.CONVERTED && quotation.convertedInvoiceId) {
    throw new Error('This quotation has already been converted into an invoice.');
  }

  // Create an invoice using existing createInvoice service
  const lineItems: LineItemInput[] = quotation.items.map((item) => ({
    productId: item.productId || undefined,
    hsnCode: item.hsnCode || undefined,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    discount: item.discount,
    discountType: item.discountType as any,
    taxRate: item.taxRate,
  }));

  const invoice = await createInvoice(businessId, userId, {
    customerId: quotation.customerId,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 15 * 86400000),
    gstType: quotation.gstType,
    isTaxInclusive: quotation.isTaxInclusive,
    isGstInvoice: quotation.isGstInvoice,
    items: lineItems,
    paidAmount: 0,
    notes: quotation.notes ? `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes}` : `Converted from Quotation ${quotation.quotationNumber}.`,
    termsAndConditions: quotation.termsAndConditions || undefined,
    status: InvoiceStatus.UNPAID,
  });

  // Mark quotation as CONVERTED and link the invoice ID
  const updatedQuotation = await prisma.quotation.update({
    where: { id: quotationId },
    data: {
      status: QuotationStatus.CONVERTED,
      convertedInvoiceId: invoice.id,
    },
  });

  return {
    invoice,
    quotation: updatedQuotation,
  };
}

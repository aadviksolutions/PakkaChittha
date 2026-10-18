import prisma from '@/lib/prisma';
import {
  calculateInvoiceTotals,
  LineItemInput,
  GstType,
  round2,
} from '@/lib/billing/calculator';
import { generateInvoiceNumber } from '@/lib/billing/sequence';
import { InvoiceStatus, PaymentMethod, StockMovementType } from '@prisma/client';
import { calculateSubscriptionTrialInfo } from '@/lib/subscription/trial';

export interface CreateInvoiceInput {
  customerId: string;
  invoiceDate?: string | Date;
  dueDate: string | Date;
  gstType?: GstType;
  isTaxInclusive?: boolean;
  isGstInvoice?: boolean;
  items: LineItemInput[];
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  termsAndConditions?: string;
  status?: InvoiceStatus;
  isDraft?: boolean;
}

export interface InvoiceFilters {
  search?: string;
  customerId?: string;
  status?: InvoiceStatus;
  startDate?: string | Date;
  endDate?: string | Date;
}

/**
 * Creates an invoice with server-validated totals, concurrent-safe numbering,
 * customer & business profile snapshots, and optional initial payment.
 * Operates within an ACID transaction.
 */
export async function createInvoice(
  businessId: string,
  _userId: string,
  input: CreateInvoiceInput
) {
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one line item is required to generate an invoice.');
  }

  // 1. Verify customer belongs to the active tenant
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, businessId },
  });

  if (!customer) {
    throw new Error('Selected customer does not exist in this business workspace.');
  }

  // 2. Fetch business profile for historical snapshot
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new Error('Active business workspace not found.');
  }

  // 2b. Verify subscription status and monthly quota enforcement
  const subscription = await prisma.subscription.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });

  if (subscription) {
    const trial = calculateSubscriptionTrialInfo(subscription);
    if (trial.status === 'SUSPENDED') {
      throw new Error('Workspace subscription is currently suspended. Please contact support or renew.');
    }
    if (trial.isExpired || trial.status === 'EXPIRED') {
      throw new Error('Workspace trial or subscription has expired. Please upgrade or renew your plan.');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCount = await prisma.invoice.count({
      where: {
        businessId,
        createdAt: { gte: startOfMonth },
      },
    });

    // All official plans (Starter, Growth, Scale) feature unlimited invoices
    const isUnlimited =
      subscription.plan === 'STARTER' ||
      subscription.plan === 'GROWTH_PRO' ||
      subscription.plan === 'ENTERPRISE' ||
      subscription.maxMonthlyInvoices >= 999999;

    if (!isUnlimited && monthlyCount >= subscription.maxMonthlyInvoices) {
      throw new Error(
        `Monthly invoice quota of ${subscription.maxMonthlyInvoices} invoices reached for ${subscription.plan} plan. Please upgrade your subscription.`
      );
    }
  }

  // 3. Calculate financial totals on the server (never trust client amounts)
  const gstType: GstType = input.gstType || 'CGST_SGST';
  const isTaxInclusive = Boolean(input.isTaxInclusive);
  const isGstInvoice = input.isGstInvoice !== false;
  const initialPaid = round2(Math.max(0, Number(input.paidAmount) || 0));

  const calc = calculateInvoiceTotals({
    items: input.items,
    gstType,
    isTaxInclusive,
    isGstInvoice,
    paidAmount: initialPaid,
    enableRounding: true,
  });

  const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : new Date();
  const dueDate = input.dueDate ? new Date(input.dueDate) : new Date(invoiceDate.getTime() + 15 * 86400000);

  let initialStatus: InvoiceStatus = InvoiceStatus.UNPAID;
  if (input.status === InvoiceStatus.DRAFT || input.isDraft) {
    initialStatus = InvoiceStatus.DRAFT;
  } else if (calc.paidAmount >= calc.total && calc.total > 0) {
    initialStatus = InvoiceStatus.PAID;
  } else if (calc.paidAmount > 0) {
    initialStatus = InvoiceStatus.PARTIAL;
  }

  // 4. Execute atomic transaction
  return prisma.$transaction(async (tx) => {
    // Check inventory stock and enforce allowNegativeStock policy
    for (const item of calc.items) {
      if (item.productId) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId },
        });
        if (product) {
          if (!business.allowNegativeStock && product.currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for product "${product.name}". Available: ${product.currentStock} ${product.unit}, Requested: ${item.quantity} ${product.unit}.`
            );
          }
        }
      }
    }

    // Generate sequential invoice number safely
    const invoiceNumber = await generateInvoiceNumber(tx, businessId, 'INV');

    // Build invoice record
    const invoice = await tx.invoice.create({
      data: {
        businessId,
        customerId: customer.id,
        invoiceNumber,
        invoiceDate,
        dueDate,
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
        paidAmount: calc.paidAmount,
        balanceDue: calc.balanceDue,

        // Snapshot of customer at time of invoicing
        customerName: customer.name,
        customerMobile: customer.mobile,
        customerGstin: customer.gstin,
        customerBillingAddress: customer.billingAddress,

        // Snapshot of business at time of invoicing
        businessName: business.name,
        businessGstin: business.gstin,
        businessAddress: [business.city, business.state].filter(Boolean).join(', ') || null,
        businessLogoUrl: business.logoUrl || null,

        notes: input.notes?.trim() || null,
        termsAndConditions:
          input.termsAndConditions?.trim() ||
          '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged after due date.\n3. Subject to local jurisdiction.',

        items: {
          create: calc.items.map((item) => ({
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            discount: item.discount,
            discountType: item.discountType,
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
      },
    });

    // 5. Update inventory and record SALE_DEDUCTION movements for linked products
    for (const item of invoice.items) {
      if (item.productId) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId },
        });

        if (product) {
          const previousStock = product.currentStock;
          const newStock = round2(previousStock - item.quantity);

          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              businessId,
              productId: product.id,
              type: StockMovementType.SALE_DEDUCTION,
              quantity: -item.quantity,
              previousStock,
              newStock,
              sourceDocumentType: 'INVOICE',
              sourceDocumentId: invoice.id,
              reason: `Sale on invoice ${invoice.invoiceNumber}`,
              actorName: _userId || 'Staff',
            },
          });
        }
      }
    }

    // 6. If initial payment recorded, create Payment record
    if (calc.paidAmount > 0) {
      await tx.payment.create({
        data: {
          businessId,
          invoiceId: invoice.id,
          customerId: customer.id,
          amount: calc.paidAmount,
          paymentDate: invoiceDate,
          paymentMethod: input.paymentMethod || PaymentMethod.CASH,
          referenceNumber: input.paymentReference?.trim() || null,
          notes: 'Initial payment recorded during invoice generation',
        },
      });
    }

    return invoice;
  }, { timeout: 25000, maxWait: 10000 });
}

/**
 * Retrieves invoices belonging strictly to the specified business tenant with filters.
 */
export async function getInvoices(businessId: string, filters: InvoiceFilters = {}) {
  const where: {
    businessId: string;
    customerId?: string;
    status?: InvoiceStatus;
    invoiceDate?: { gte?: Date; lte?: Date };
    OR?: {
      invoiceNumber?: { contains: string; mode: 'insensitive' };
      customerName?: { contains: string; mode: 'insensitive' };
    }[];
  } = { businessId };

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    where.invoiceDate = {};
    if (filters.startDate) where.invoiceDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.invoiceDate.lte = new Date(filters.endDate);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
    ];
  }

  return prisma.invoice.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          mobile: true,
          gstin: true,
        },
      },
      items: true,
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
    orderBy: { invoiceDate: 'desc' },
  });
}

/**
 * Retrieves a single invoice by ID with strict tenant authorization.
 */
export async function getInvoiceById(businessId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      businessId,
    },
    include: {
      business: true,
      customer: true,
      items: true,
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });
}

/**
 * Safely cancels/voids an invoice with an audit trail.
 * Never silently deletes financial records.
 */
export async function voidInvoice(
  businessId: string,
  invoiceId: string,
  reason: string,
  cancelledByUserName?: string
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { items: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found or unauthorized.');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Invoice is already cancelled.');
    }

    // Reconcile / restore inventory for all invoiced products
    for (const item of invoice.items) {
      if (item.productId) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId },
        });

        if (product) {
          const previousStock = product.currentStock;
          const newStock = round2(previousStock + item.quantity);

          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              businessId,
              productId: product.id,
              type: StockMovementType.SALE_RETURN,
              quantity: item.quantity,
              previousStock,
              newStock,
              sourceDocumentType: 'INVOICE_CANCEL',
              sourceDocumentId: invoice.id,
              reason: `Sale restored via invoice cancellation: ${reason?.trim() || 'Cancelled'}`,
              actorName: cancelledByUserName || 'Staff',
            },
          });
        }
      }
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || 'Cancelled by authorized user',
        cancelledBy: cancelledByUserName || 'Authorized Staff',
        balanceDue: 0, // Voided invoices no longer hold outstanding balance
      },
    });
  }, { timeout: 25000, maxWait: 10000 });
}

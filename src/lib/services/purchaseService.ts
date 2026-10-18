import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { generatePurchaseNumber } from '@/lib/billing/purchaseSequence';
import { PurchaseStatus, PaymentMethod, StockMovementType } from '@prisma/client';

export interface PurchaseItemInput {
  productId?: string | null;
  hsnCode?: string | null;
  description: string;
  quantity: number;
  unit?: string;
  purchaseRate: number;
  discount?: number;
  taxRate?: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  supplierInvoiceNumber?: string | null;
  purchaseDate?: string | Date;
  dueDate?: string | Date | null;
  status?: PurchaseStatus; // DRAFT or RECEIVED
  items: PurchaseItemInput[];
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string | null;
  notes?: string | null;
  itcEligibility?: string; // ELIGIBLE, INELIGIBLE, BLOCKED_SEC_17_5, CAPITAL_GOODS, PENDING_VERIFICATION, RECONCILED
  placeOfSupply?: string | null;
  documentUrl?: string | null;
}

export interface RecordSupplierPaymentInput {
  purchaseId: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string | Date;
  referenceNumber?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Creates a purchase order or received purchase bill transactionally.
 * If status is RECEIVED, stock movements are immediately recorded and inventory is updated.
 */
export async function createPurchase(
  businessId: string,
  input: CreatePurchaseInput,
  actorName = 'Staff'
) {
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one purchase item is required.');
  }

  // 1. Verify supplier belongs to business
  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, businessId },
  });

  if (!supplier) {
    throw new Error('Supplier not found or unauthorized.');
  }

  // 1b. Determine place of supply and inter-state status
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { gstin: true, state: true },
  });

  const suppGstin = supplier.gstin?.trim().toUpperCase();
  const bGstin = business?.gstin?.trim().toUpperCase();
  const isInterState = Boolean(
    suppGstin &&
      bGstin &&
      suppGstin.length >= 2 &&
      bGstin.length >= 2 &&
      suppGstin.slice(0, 2) !== bGstin.slice(0, 2)
  );

  // 2. Calculate item totals and invoice figures
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedItems = input.items.map((item) => {
    const qty = Math.max(0.001, Number(item.quantity || 1));
    const rate = Math.max(0, Number(item.purchaseRate || 0));
    const disc = Math.max(0, Number(item.discount || 0));
    const taxRate = Math.max(0, Number(item.taxRate || 0));

    const lineGross = qty * rate;
    const lineTaxable = Math.max(0, lineGross - disc);
    const lineTax = round2(lineTaxable * (taxRate / 100));
    const lineTotal = round2(lineTaxable + lineTax);

    subtotal += lineTaxable;
    discountTotal += disc;
    taxTotal += lineTax;

    const cgstRate = isInterState ? 0 : taxRate / 2;
    const cgstAmount = isInterState ? 0 : round2(lineTax / 2);
    const sgstRate = isInterState ? 0 : taxRate / 2;
    const sgstAmount = isInterState ? 0 : round2(lineTax / 2);
    const igstRate = isInterState ? taxRate : 0;
    const igstAmount = isInterState ? lineTax : 0;

    cgstTotal += cgstAmount;
    sgstTotal += sgstAmount;
    igstTotal += igstAmount;

    return {
      productId: item.productId?.trim() || null,
      hsnCode: item.hsnCode?.trim() || null,
      description: item.description.trim(),
      quantity: round2(qty),
      unit: item.unit?.trim() || 'Pcs',
      purchaseRate: round2(rate),
      discount: round2(disc),
      taxRate: round2(taxRate),
      taxAmount: lineTax,
      cgstRate: round2(cgstRate),
      cgstAmount,
      sgstRate: round2(sgstRate),
      sgstAmount,
      igstRate: round2(igstRate),
      igstAmount,
      lineTotal,
    };
  });

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxTotal = round2(taxTotal);
  cgstTotal = round2(cgstTotal);
  sgstTotal = round2(sgstTotal);
  igstTotal = round2(igstTotal);
  const total = round2(subtotal + taxTotal);

  const initialPaid = Math.max(0, round2(Number(input.paidAmount || 0)));
  if (initialPaid > total) {
    throw new Error(`Initial payment (₹${initialPaid}) cannot exceed purchase total (₹${total}).`);
  }

  const balanceDue = round2(total - initialPaid);
  const targetStatus = input.status === PurchaseStatus.RECEIVED ? PurchaseStatus.RECEIVED : PurchaseStatus.DRAFT;

  return prisma.$transaction(async (tx) => {
    // Generate sequential purchase number
    const purchaseNumber = await generatePurchaseNumber(tx, businessId);

    // Create Purchase
    const purchase = await tx.purchase.create({
      data: {
        businessId,
        supplierId: supplier.id,
        purchaseNumber,
        supplierInvoiceNumber: input.supplierInvoiceNumber?.trim() || null,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: targetStatus,
        subtotal,
        discountTotal,
        taxTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        itcEligibility: input.itcEligibility || 'ELIGIBLE',
        placeOfSupply: input.placeOfSupply?.trim() || supplier.address?.trim() || null,
        documentUrl: input.documentUrl?.trim() || null,
        total,
        paidAmount: initialPaid,
        balanceDue,
        notes: input.notes?.trim() || null,
        receivedAt: targetStatus === PurchaseStatus.RECEIVED ? new Date() : null,
        receivedBy: targetStatus === PurchaseStatus.RECEIVED ? actorName : null,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Record initial supplier payment if provided
    if (initialPaid > 0) {
      await tx.supplierPayment.create({
        data: {
          businessId,
          purchaseId: purchase.id,
          supplierId: supplier.id,
          amount: initialPaid,
          paymentMethod: input.paymentMethod || PaymentMethod.BANK_TRANSFER,
          referenceNumber: input.paymentReference?.trim() || null,
          notes: 'Initial payment at purchase creation',
          recordedBy: actorName,
        },
      });
    }

    // If marked as RECEIVED upon creation, increase stock and record movements
    if (targetStatus === PurchaseStatus.RECEIVED) {
      for (const item of purchase.items) {
        if (item.productId) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, businessId },
          });

          if (product) {
            const previousStock = product.currentStock;
            const newStock = round2(previousStock + item.quantity);

            await tx.product.update({
              where: { id: product.id },
              data: {
                currentStock: newStock,
                // Update purchasePrice to latest cost price if higher or present
                purchasePrice: item.purchaseRate > 0 ? item.purchaseRate : product.purchasePrice,
              },
            });

            await tx.stockMovement.create({
              data: {
                businessId,
                productId: product.id,
                type: StockMovementType.PURCHASE_RECEIVED,
                quantity: item.quantity,
                previousStock,
                newStock,
                sourceDocumentType: 'PURCHASE',
                sourceDocumentId: purchase.id,
                reason: `Received under purchase bill ${purchase.purchaseNumber}`,
                actorName,
              },
            });
          }
        }
      }
    }

    return purchase;
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Mark a DRAFT purchase order as RECEIVED, updating stock and creating auditable movements
 */
export async function receivePurchase(businessId: string, purchaseId: string, actorName = 'Staff') {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id: purchaseId, businessId },
      include: { items: true },
    });

    if (!purchase) {
      throw new Error('Purchase not found or unauthorized.');
    }

    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new Error('This purchase is already received.');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new Error('Cannot receive a cancelled purchase order.');
    }

    // Check if stock movement was already recorded for this purchase to prevent duplicate increments
    const existingMovement = await tx.stockMovement.findFirst({
      where: {
        businessId,
        sourceDocumentType: 'PURCHASE',
        sourceDocumentId: purchase.id,
      },
    });

    if (existingMovement) {
      throw new Error('Stock movements already exist for this purchase.');
    }

    // 1. Update purchase status
    const updatedPurchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: PurchaseStatus.RECEIVED,
        receivedAt: new Date(),
        receivedBy: actorName,
      },
    });

    // 2. Increment stock and create movements for each linked product
    for (const item of purchase.items) {
      if (item.productId) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId },
        });

        if (product) {
          const previousStock = product.currentStock;
          const newStock = round2(previousStock + item.quantity);

          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: newStock,
              purchasePrice: item.purchaseRate > 0 ? item.purchaseRate : product.purchasePrice,
            },
          });

          await tx.stockMovement.create({
            data: {
              businessId,
              productId: product.id,
              type: StockMovementType.PURCHASE_RECEIVED,
              quantity: item.quantity,
              previousStock,
              newStock,
              sourceDocumentType: 'PURCHASE',
              sourceDocumentId: purchase.id,
              reason: `Goods received against purchase bill ${purchase.purchaseNumber}`,
              actorName,
            },
          });
        }
      }
    }

    return updatedPurchase;
  }, { timeout: 15000 });
}

/**
 * Void/cancel a purchase order. If it was already RECEIVED, reverse the stock movements
 * with PURCHASE_RETURN entries.
 */
export async function voidPurchase(
  businessId: string,
  purchaseId: string,
  reason: string,
  actorName = 'Staff'
) {
  if (!reason.trim()) {
    throw new Error('Cancellation reason is required.');
  }

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { allowNegativeStock: true },
    });

    const purchase = await tx.purchase.findFirst({
      where: { id: purchaseId, businessId },
      include: { items: true },
    });

    if (!purchase) {
      throw new Error('Purchase not found or unauthorized.');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new Error('Purchase is already cancelled.');
    }

    // If it was RECEIVED, check if reversing would cause negative stock
    if (purchase.status === PurchaseStatus.RECEIVED) {
      for (const item of purchase.items) {
        if (item.productId) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, businessId },
          });

          if (product && !business?.allowNegativeStock && product.currentStock < item.quantity) {
            throw new Error(
              `Cannot void purchase: Product "${product.name}" only has ${product.currentStock} in stock, but reversing purchase requires returning ${item.quantity}.`
            );
          }
        }
      }

      // Reverse stock movements
      for (const item of purchase.items) {
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
                type: StockMovementType.PURCHASE_RETURN,
                quantity: -item.quantity,
                previousStock,
                newStock,
                sourceDocumentType: 'PURCHASE_CANCEL',
                sourceDocumentId: purchase.id,
                reason: `Purchase cancelled: ${reason.trim()}`,
                actorName,
              },
            });
          }
        }
      }
    }

    return tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: PurchaseStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: actorName,
        cancellationReason: reason.trim(),
        balanceDue: 0,
      },
    });
  }, { timeout: 15000 });
}

/**
 * Record payment to supplier against purchase
 */
export async function recordSupplierPayment(
  businessId: string,
  input: RecordSupplierPaymentInput,
  actorName = 'Staff'
) {
  const payAmount = round2(Number(input.amount));
  if (payAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await prisma.supplierPayment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      const currentPurchase = await prisma.purchase.findFirstOrThrow({
        where: { id: existing.purchaseId, businessId },
      });
      return { payment: existing, updatedPurchase: currentPurchase, isDuplicate: true };
    }
  }

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id: input.purchaseId, businessId },
    });

    if (!purchase) {
      throw new Error('Purchase not found or unauthorized.');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new Error('Cannot record payments on a cancelled purchase.');
    }

    if (purchase.balanceDue <= 0) {
      throw new Error('This purchase is already fully paid.');
    }

    if (payAmount > purchase.balanceDue) {
      throw new Error(
        `Payment amount (₹${payAmount}) exceeds purchase balance due (₹${purchase.balanceDue}).`
      );
    }

    const payment = await tx.supplierPayment.create({
      data: {
        businessId,
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        amount: payAmount,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        paymentMethod: input.paymentMethod || PaymentMethod.BANK_TRANSFER,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey?.trim() || null,
        recordedBy: actorName,
      },
    });

    const newPaidAmount = round2(purchase.paidAmount + payAmount);
    const newBalanceDue = round2(Math.max(0, purchase.total - newPaidAmount));

    const updatedPurchase = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
      },
    });

    return { payment, updatedPurchase, isDuplicate: false };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Fetch purchases list with filters
 */
export async function getPurchases(
  businessId: string,
  options?: {
    supplierId?: string;
    status?: PurchaseStatus;
    query?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const where: any = { businessId };

  if (options?.supplierId) {
    where.supplierId = options.supplierId;
  }

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.query?.trim()) {
    const q = options.query.trim();
    where.OR = [
      { purchaseNumber: { contains: q, mode: 'insensitive' } },
      { supplierInvoiceNumber: { contains: q, mode: 'insensitive' } },
      { supplier: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  if (options?.dateFrom || options?.dateTo) {
    where.purchaseDate = {};
    if (options.dateFrom) where.purchaseDate.gte = new Date(options.dateFrom);
    if (options.dateTo) where.purchaseDate.lte = new Date(options.dateTo + 'T23:59:59.999Z');
  }

  return prisma.purchase.findMany({
    where,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          phone: true,
          gstin: true,
        },
      },
      items: true,
    },
    orderBy: { purchaseDate: 'desc' },
  });
}

/**
 * Get detailed purchase by ID
 */
export async function getPurchaseById(businessId: string, purchaseId: string) {
  return prisma.purchase.findFirst({
    where: { id: purchaseId, businessId },
    include: {
      supplier: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              currentStock: true,
              unit: true,
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });
}

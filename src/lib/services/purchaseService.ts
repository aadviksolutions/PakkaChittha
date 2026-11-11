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
 * Updates a non-cancelled purchase bill, reconciling stock if RECEIVED and preserving payments.
 */
export async function updatePurchase(
  businessId: string,
  purchaseId: string,
  input: CreatePurchaseInput,
  actorName = 'Staff'
) {
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one purchase item is required.');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.purchase.findFirst({
      where: { id: purchaseId, businessId },
      include: { items: true, payments: true },
    });

    if (!existing) {
      throw new Error('Purchase not found or unauthorized.');
    }
    if (existing.status === PurchaseStatus.CANCELLED) {
      throw new Error('Cancelled purchase bills cannot be edited.');
    }

    const supplier = await tx.supplier.findFirst({
      where: { id: input.supplierId, businessId },
    });
    if (!supplier) {
      throw new Error('Supplier not found or unauthorized.');
    }

    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { gstin: true, state: true, allowNegativeStock: true },
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

    const existingPaid =
      existing.payments.length > 0
        ? round2(existing.payments.reduce((acc, p) => acc + p.amount, 0))
        : round2(existing.paidAmount);

    if (existingPaid > total + 0.01) {
      throw new Error(
        `New purchase total (₹${total}) cannot be less than already paid amount (₹${existingPaid}). Please adjust supplier payments first.`
      );
    }

    const balanceDue = round2(Math.max(0, total - existingPaid));
    const targetStatus =
      input.status === PurchaseStatus.RECEIVED
        ? PurchaseStatus.RECEIVED
        : input.status === PurchaseStatus.DRAFT
        ? PurchaseStatus.DRAFT
        : existing.status;

    // 1. Reverse stock for old items if old purchase was RECEIVED
    if (existing.status === PurchaseStatus.RECEIVED) {
      for (const oldItem of existing.items) {
        if (oldItem.productId) {
          const product = await tx.product.findFirst({
            where: { id: oldItem.productId, businessId },
          });
          if (product) {
            const previousStock = product.currentStock;
            const newStock = round2(previousStock - oldItem.quantity);
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: newStock },
            });
            await tx.stockMovement.create({
              data: {
                businessId,
                productId: product.id,
                type: StockMovementType.PURCHASE_RETURN,
                quantity: -oldItem.quantity,
                previousStock,
                newStock,
                sourceDocumentType: 'PURCHASE_EDIT',
                sourceDocumentId: existing.id,
                reason: `Stock adjusted for purchase edit ${existing.purchaseNumber}`,
                actorName,
              },
            });
          }
        }
      }
    }

    // 2. Apply stock for updated items if targetStatus is RECEIVED
    if (targetStatus === PurchaseStatus.RECEIVED) {
      for (const newItem of calculatedItems) {
        if (newItem.productId) {
          const product = await tx.product.findFirst({
            where: { id: newItem.productId, businessId },
          });
          if (product) {
            const previousStock = product.currentStock;
            const newStock = round2(previousStock + newItem.quantity);
            await tx.product.update({
              where: { id: product.id },
              data: {
                currentStock: newStock,
                purchasePrice:
                  newItem.purchaseRate > 0 ? newItem.purchaseRate : product.purchasePrice,
              },
            });
            await tx.stockMovement.create({
              data: {
                businessId,
                productId: product.id,
                type: StockMovementType.PURCHASE_RECEIVED,
                quantity: newItem.quantity,
                previousStock,
                newStock,
                sourceDocumentType: 'PURCHASE_EDIT',
                sourceDocumentId: existing.id,
                reason: `Updated purchase items for ${existing.purchaseNumber}`,
                actorName,
              },
            });
          }
        }
      }
    }

    if (supplier.id !== existing.supplierId) {
      await tx.supplierPayment.updateMany({
        where: { purchaseId: existing.id },
        data: { supplierId: supplier.id },
      });
    }

    await tx.purchaseItem.deleteMany({ where: { purchaseId: existing.id } });

    return tx.purchase.update({
      where: { id: existing.id },
      data: {
        supplierId: supplier.id,
        supplierInvoiceNumber:
          input.supplierInvoiceNumber !== undefined
            ? input.supplierInvoiceNumber?.trim() || null
            : existing.supplierInvoiceNumber,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : existing.purchaseDate,
        dueDate:
          input.dueDate !== undefined
            ? input.dueDate
              ? new Date(input.dueDate)
              : null
            : existing.dueDate,
        status: targetStatus,
        receivedAt:
          targetStatus === PurchaseStatus.RECEIVED
            ? existing.receivedAt || new Date()
            : null,
        receivedBy:
          targetStatus === PurchaseStatus.RECEIVED
            ? existing.receivedBy || actorName
            : null,
        subtotal,
        discountTotal,
        taxTotal,
        cgstTotal,
        sgstTotal,
        igstTotal,
        itcEligibility: input.itcEligibility || existing.itcEligibility,
        placeOfSupply:
          input.placeOfSupply !== undefined
            ? input.placeOfSupply?.trim() || null
            : existing.placeOfSupply,
        documentUrl:
          input.documentUrl !== undefined
            ? input.documentUrl?.trim() || null
            : existing.documentUrl,
        total,
        paidAmount: existingPaid,
        balanceDue,
        notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        items: { create: calculatedItems },
      },
      include: { items: true, payments: true },
    });
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Permanently deletes a purchase bill, reversing stock movements if RECEIVED.
 */
export async function deletePurchase(
  businessId: string,
  purchaseId: string,
  actorName = 'Staff'
) {
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

    if (purchase.status === PurchaseStatus.RECEIVED) {
      for (const item of purchase.items) {
        if (item.productId) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, businessId },
          });
          if (product) {
            if (!business?.allowNegativeStock && product.currentStock < item.quantity) {
              throw new Error(
                `Cannot delete purchase: Product "${product.name}" only has ${product.currentStock} in stock, reversing requires ${item.quantity}.`
              );
            }
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
                sourceDocumentType: 'PURCHASE_DELETE',
                sourceDocumentId: purchase.id,
                reason: `Stock reversed on deletion of purchase ${purchase.purchaseNumber}`,
                actorName,
              },
            });
          }
        }
      }
    }

    await tx.purchase.delete({ where: { id: purchaseId } });
    return { deletedId: purchaseId, purchaseNumber: purchase.purchaseNumber };
  }, { maxWait: 15000, timeout: 30000 });
}

async function recomputePurchaseBalance(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  purchaseId: string,
  purchaseTotal: number
) {
  const payments = await tx.supplierPayment.findMany({
    where: { purchaseId },
    select: { amount: true },
  });
  const paidAmount = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const balanceDue = round2(Math.max(0, purchaseTotal - paidAmount));
  return tx.purchase.update({
    where: { id: purchaseId },
    data: { paidAmount, balanceDue },
  });
}

export async function updateSupplierPayment(
  businessId: string,
  purchaseId: string,
  paymentId: string,
  input: {
    amount?: number;
    paymentMethod?: PaymentMethod;
    paymentDate?: string | Date;
    referenceNumber?: string | null;
    notes?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.findFirst({
      where: { id: paymentId, purchaseId, businessId },
      include: { purchase: true },
    });

    if (!payment) {
      throw new Error('Supplier payment not found or unauthorized.');
    }
    if (payment.purchase.status === PurchaseStatus.CANCELLED) {
      throw new Error('Cannot modify payments on a cancelled purchase bill.');
    }

    const newAmount =
      input.amount !== undefined ? round2(Number(input.amount)) : payment.amount;
    if (isNaN(newAmount) || newAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const otherPayments = await tx.supplierPayment.findMany({
      where: { purchaseId, id: { not: paymentId } },
      select: { amount: true },
    });
    const otherPaid = round2(otherPayments.reduce((sum, p) => sum + p.amount, 0));
    if (otherPaid + newAmount > payment.purchase.total + 0.01) {
      const maxAllowed = round2(Math.max(0, payment.purchase.total - otherPaid));
      throw new Error(
        `Updated payment (₹${newAmount}) exceeds remaining purchase balance (max ₹${maxAllowed}).`
      );
    }

    const updatedPayment = await tx.supplierPayment.update({
      where: { id: paymentId },
      data: {
        amount: newAmount,
        paymentMethod: input.paymentMethod || payment.paymentMethod,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : payment.paymentDate,
        referenceNumber:
          input.referenceNumber !== undefined
            ? input.referenceNumber?.trim() || null
            : payment.referenceNumber,
        notes: input.notes !== undefined ? input.notes?.trim() || null : payment.notes,
      },
    });

    const updatedPurchase = await recomputePurchaseBalance(
      tx,
      purchaseId,
      payment.purchase.total
    );

    return { payment: updatedPayment, updatedPurchase };
  });
}

export async function deleteSupplierPayment(
  businessId: string,
  purchaseId: string,
  paymentId: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.findFirst({
      where: { id: paymentId, purchaseId, businessId },
      include: { purchase: true },
    });

    if (!payment) {
      throw new Error('Supplier payment not found or unauthorized.');
    }

    await tx.supplierPayment.delete({ where: { id: paymentId } });

    const updatedPurchase = await recomputePurchaseBalance(
      tx,
      purchaseId,
      payment.purchase.total
    );

    return { updatedPurchase };
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

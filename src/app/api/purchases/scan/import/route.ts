import { NextRequest, NextResponse } from 'next/server';
import { requireCommercialAccess, AuthError } from '@/lib/auth/guards';
import { checkFeatureEntitlement } from '@/lib/subscription/entitlements';
import prisma from '@/lib/prisma';
import { generatePurchaseNumber } from '@/lib/billing/purchaseSequence';
import { StockMovementType, PurchaseStatus } from '@prisma/client';
import { round2 } from '@/lib/billing/calculator';

interface ImportItemInput {
  description: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  discount?: number;
  taxRate?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { business, session } = await requireCommercialAccess();

    // 1. Strict Server-Side Entitlement Check: Highest Plan Only
    const entitlement = await checkFeatureEntitlement(business.id, 'canImportScannedPurchases');
    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            entitlement.message ||
            'Importing scanned purchases directly into inventory is a feature of Pakka Chittha Scale (highest plan).',
          upgradeRequired: true,
          requiredPlan: 'SCALE',
          planName: 'Pakka Chittha Scale',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      supplierName,
      supplierGstin,
      supplierPhone,
      supplierInvoiceNumber,
      purchaseDate,
      items,
      scannedBillUrl,
      ocrData,
      notes,
    } = body;

    const cleanSupplierName = String(supplierName || '').trim();
    if (!cleanSupplierName) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required.' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one confirmed purchase line item is required.' },
        { status: 400 }
      );
    }

    // 2. Safeguard against duplicate submissions & duplicate stock additions
    const cleanInvoiceNumber = supplierInvoiceNumber ? String(supplierInvoiceNumber).trim() : null;

    if (cleanInvoiceNumber) {
      const existingPurchase = await prisma.purchase.findFirst({
        where: {
          businessId: business.id,
          supplierInvoiceNumber: {
            equals: cleanInvoiceNumber,
            mode: 'insensitive',
          },
        },
        include: { supplier: true },
      });

      if (existingPurchase) {
        return NextResponse.json(
          {
            success: false,
            error: `Purchase bill "${cleanInvoiceNumber}" has already been imported on ${existingPurchase.createdAt.toLocaleDateString('en-IN')}. Duplicate submission blocked to prevent accidental stock inflation.`,
            alreadyImported: true,
            existingPurchaseId: existingPurchase.id,
          },
          { status: 409 }
        );
      }
    }

    // 3. Database Transaction: Supplier Resolution, Inventory Update & Purchase Creation
    const result = await prisma.$transaction(async (tx) => {
      // 3a. Find or create supplier
      let supplier = await tx.supplier.findFirst({
        where: {
          businessId: business.id,
          name: { equals: cleanSupplierName, mode: 'insensitive' },
        },
      });

      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            businessId: business.id,
            name: cleanSupplierName,
            gstin: supplierGstin?.trim().toUpperCase() || null,
            phone: supplierPhone?.trim() || '9999999999',
          },
        });
      } else if (supplierGstin && !supplier.gstin) {
        supplier = await tx.supplier.update({
          where: { id: supplier.id },
          data: { gstin: supplierGstin.trim().toUpperCase() },
        });
      }

      // 3b. Generate official purchase sequence number
      const purchaseNumber = await generatePurchaseNumber(tx, business.id);

      // 3c. Calculate financial figures
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let cgstTotal = 0;
      let sgstTotal = 0;
      let igstTotal = 0;

      const businessDetails = await tx.business.findUnique({
        where: { id: business.id },
        select: { gstin: true, state: true },
      });

      const suppGstin = supplier.gstin?.trim().toUpperCase();
      const bGstin = businessDetails?.gstin?.trim().toUpperCase();
      const isInterState = Boolean(
        suppGstin &&
          bGstin &&
          suppGstin.length >= 2 &&
          bGstin.length >= 2 &&
          suppGstin.slice(0, 2) !== bGstin.slice(0, 2)
      );

      // Process line items & update stock
      const processedItems: any[] = [];
      const updatedProductsSummary: { name: string; addedStock: number; newStock: number }[] = [];

      for (const rawItem of items as ImportItemInput[]) {
        const itemDesc = String(rawItem.description || 'Item').trim();
        const qty = Math.max(0.001, Number(rawItem.quantity || 1));
        const rate = Math.max(0, Number(rawItem.purchaseRate || 0));
        const disc = Math.max(0, Number(rawItem.discount || 0));
        const taxRate = Math.max(0, Number(rawItem.taxRate || 18));
        const unit = String(rawItem.unit || 'Pcs').trim();

        const lineGross = qty * rate;
        const lineTaxable = Math.max(0, lineGross - disc);
        const lineTax = round2(lineTaxable * (taxRate / 100));
        const lineTotal = round2(lineTaxable + lineTax);

        subtotal += lineTaxable;
        discountTotal += disc;
        taxTotal += lineTax;

        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;

        if (isInterState) {
          igstRate = taxRate;
          igstAmount = lineTax;
          igstTotal += lineTax;
        } else {
          cgstRate = round2(taxRate / 2);
          cgstAmount = round2(lineTax / 2);
          sgstRate = round2(taxRate / 2);
          sgstAmount = round2(lineTax - cgstAmount);
          cgstTotal += cgstAmount;
          sgstTotal += sgstAmount;
        }

        // Find or create product in inventory
        let product = await tx.product.findFirst({
          where: {
            businessId: business.id,
            name: { equals: itemDesc, mode: 'insensitive' },
          },
        });

        let previousStock = 0;
        let newStock = qty;

        if (!product) {
          const skuCode = `SKU-${Date.now().toString().slice(-6)}-${processedItems.length + 1}`;
          product = await tx.product.create({
            data: {
              businessId: business.id,
              name: itemDesc,
              sku: skuCode,
              unit,
              category: 'General',
              purchasePrice: rate,
              sellingPrice: round2(rate * 1.25), // 25% default markup if newly created
              taxRate,
              openingStock: 0,
              currentStock: qty,
              lowStockAlert: 10,
              isActive: true,
            },
          });
          previousStock = 0;
          newStock = qty;
        } else {
          previousStock = product.currentStock;
          newStock = round2(product.currentStock + qty);
          product = await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: newStock,
              purchasePrice: rate > 0 ? rate : product.purchasePrice,
            },
          });
        }

        // Record stock movement audit trail
        await tx.stockMovement.create({
          data: {
            businessId: business.id,
            productId: product.id,
            type: StockMovementType.PURCHASE_RECEIVED,
            quantity: qty,
            previousStock,
            newStock,
            sourceDocumentType: 'PURCHASE',
            reason: `Scanned Bill Import: ${cleanSupplierName} (${cleanInvoiceNumber || purchaseNumber})`,
            actorName: session.user.name || 'System OCR',
          },
        });

        updatedProductsSummary.push({
          name: product.name,
          addedStock: qty,
          newStock: product.currentStock,
        });

        processedItems.push({
          productId: product.id,
          description: itemDesc,
          quantity: qty,
          unit,
          purchaseRate: rate,
          discount: disc,
          taxRate,
          taxAmount: lineTax,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          lineTotal,
        });
      }

      const grandTotal = round2(subtotal + taxTotal);
      const effectiveDate = purchaseDate ? new Date(purchaseDate) : new Date();

      // 3d. Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          businessId: business.id,
          supplierId: supplier.id,
          purchaseNumber,
          supplierInvoiceNumber: cleanInvoiceNumber,
          purchaseDate: effectiveDate,
          status: PurchaseStatus.RECEIVED,
          subtotal: round2(subtotal),
          discountTotal: round2(discountTotal),
          taxTotal: round2(taxTotal),
          cgstTotal: round2(cgstTotal),
          sgstTotal: round2(sgstTotal),
          igstTotal: round2(igstTotal),
          total: grandTotal,
          balanceDue: grandTotal,
          paidAmount: 0,
          scannedBillUrl: scannedBillUrl || null,
          ocrData: ocrData || null,
          notes: notes?.trim() || `Imported via Purchase Bill Scanner on ${new Date().toLocaleDateString('en-IN')}`,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: true,
          supplier: true,
        },
      });

      return {
        purchase,
        updatedProductsSummary,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Purchase #${result.purchase.purchaseNumber} created and ${result.updatedProductsSummary.length} inventory items successfully updated!`,
      purchase: result.purchase,
      updatedProducts: result.updatedProductsSummary,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to import scanned purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

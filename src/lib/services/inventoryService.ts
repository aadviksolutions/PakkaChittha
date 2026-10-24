import prisma from '@/lib/prisma';
import { StockMovementType } from '@prisma/client';
import { round2 } from '@/lib/billing/calculator';
import { calculateSubscriptionTrialInfo } from '@/lib/subscription/trial';

export interface CreateProductInput {
  name: string;
  sku?: string;
  barcode?: string | null;
  category?: string;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  taxRate?: number;
  openingStock?: number;
  lowStockAlert?: number;
  description?: string | null;
  imageUrl?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  category?: string;
  unit?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  taxRate?: number;
  lowStockAlert?: number;
  description?: string | null;
  imageUrl?: string | null;
}

export interface AdjustStockInput {
  quantityAdjustment: number;
  reason: string;
  actorName?: string;
}

export interface CsvProductRow {
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  unit?: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  openingStock: number;
  lowStockAlert: number;
  description?: string;
}

export interface CsvRowValidationError {
  row: number;
  field: string;
  message: string;
  raw: Record<string, string>;
}

/**
 * Fetch products with filters, search, and inventory metrics
 */
export async function getProducts(
  businessId: string,
  options?: {
    query?: string;
    category?: string;
    lowStockOnly?: boolean;
    includeArchived?: boolean;
  }
) {
  const where: any = { businessId };

  if (!options?.includeArchived) {
    where.isActive = true;
  }

  if (options?.category && options.category !== 'ALL') {
    where.category = options.category;
  }

  if (options?.query?.trim()) {
    const q = options.query.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { barcode: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  if (options?.lowStockOnly) {
    return products.filter((p) => p.currentStock <= p.lowStockAlert);
  }

  return products;
}

/**
 * Get product by ID with tenant verification and movement history
 */
export async function getProductById(businessId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  return product;
}

/**
 * Create a new product with opening stock movement
 */
export async function createProduct(
  businessId: string,
  data: CreateProductInput,
  actorName = 'System'
) {
  // Subscription check
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
  }

  const name = data.name.trim();
  if (!name) throw new Error('Product name is required.');

  // Auto-generate SKU if empty or omitted
  const rawSku = data.sku?.trim();
  let sku = rawSku;
  if (!sku) {
    const cleanPrefix = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'ITEM';
    const rand = Math.floor(1000 + Math.random() * 9000);
    sku = `${cleanPrefix}-${rand}`;
  }

  const barcode = data.barcode?.trim() || null;
  const category = data.category?.trim() || 'General';
  const unit = data.unit?.trim() || 'Pcs';
  const purchasePrice = Math.max(0, round2(Number(data.purchasePrice || 0)));
  const sellingPrice = Math.max(0, round2(Number(data.sellingPrice || 0)));
  const taxRate = Math.max(0, Number(data.taxRate || 0));
  const openingStock = Math.max(0, Number(data.openingStock || 0));
  const lowStockAlert = Math.max(0, Number(data.lowStockAlert ?? 10));
  const description = data.description?.trim() || null;

  // Check unique SKU within business, retry with suffix if auto-generated
  let existingSku = await prisma.product.findUnique({
    where: { businessId_sku: { businessId, sku } },
  });
  if (existingSku) {
    if (rawSku) {
      throw new Error(`A product with SKU "${rawSku}" already exists in this business.`);
    }
    sku = `${sku}-${Date.now().toString().slice(-4)}`;
  }

  // Check unique barcode within business if provided
  if (barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { businessId, barcode },
    });
    if (existingBarcode) {
      throw new Error(`A product with barcode "${barcode}" already exists in this business.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        businessId,
        name,
        sku,
        barcode,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        taxRate,
        openingStock,
        currentStock: openingStock,
        lowStockAlert,
        description,
        imageUrl: data.imageUrl?.trim() || null,
        isActive: true,
      },
    });

    // Record OPENING_STOCK movement if opening stock > 0
    if (openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          businessId,
          productId: product.id,
          type: StockMovementType.OPENING_STOCK,
          quantity: openingStock,
          previousStock: 0,
          newStock: openingStock,
          sourceDocumentType: 'INITIAL_SETUP',
          sourceDocumentId: product.id,
          reason: 'Initial opening stock',
          actorName,
        },
      });
    }

    return product;
  });
}

/**
 * Update product details
 */
export async function updateProduct(
  businessId: string,
  productId: string,
  data: UpdateProductInput
) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });

  if (!existing) {
    throw new Error('Product not found or unauthorized.');
  }

  // If changing SKU, check for uniqueness
  if (data.sku && data.sku.trim() !== existing.sku) {
    const duplicateSku = await prisma.product.findUnique({
      where: { businessId_sku: { businessId, sku: data.sku.trim() } },
    });
    if (duplicateSku) {
      throw new Error(`A product with SKU "${data.sku.trim()}" already exists.`);
    }
  }

  // If changing barcode, check uniqueness
  if (data.barcode && data.barcode.trim() !== existing.barcode) {
    const duplicateBarcode = await prisma.product.findFirst({
      where: { businessId, barcode: data.barcode.trim(), id: { not: productId } },
    });
    if (duplicateBarcode) {
      throw new Error(`A product with barcode "${data.barcode.trim()}" already exists.`);
    }
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      sku: data.sku !== undefined ? data.sku.trim() : undefined,
      barcode: data.barcode !== undefined ? data.barcode?.trim() || null : undefined,
      category: data.category !== undefined ? data.category.trim() : undefined,
      unit: data.unit !== undefined ? data.unit.trim() : undefined,
      purchasePrice:
        data.purchasePrice !== undefined
          ? Math.max(0, round2(Number(data.purchasePrice)))
          : undefined,
      sellingPrice:
        data.sellingPrice !== undefined
          ? Math.max(0, round2(Number(data.sellingPrice)))
          : undefined,
      taxRate: data.taxRate !== undefined ? Math.max(0, Number(data.taxRate)) : undefined,
      lowStockAlert:
        data.lowStockAlert !== undefined ? Math.max(0, Number(data.lowStockAlert)) : undefined,
      description:
        data.description !== undefined ? data.description?.trim() || null : undefined,
      imageUrl:
        data.imageUrl !== undefined ? data.imageUrl?.trim() || null : undefined,
    },
  });

  return updated;
}

/**
 * Archive or restore a product
 */
export async function archiveProduct(businessId: string, productId: string, isActive: boolean) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });

  if (!existing) {
    throw new Error('Product not found or unauthorized.');
  }

  return prisma.product.update({
    where: { id: productId },
    data: { isActive },
  });
}

/**
 * Adjust product stock manually with an audit ledger entry
 */
export async function adjustStock(
  businessId: string,
  productId: string,
  input: AdjustStockInput
) {
  const quantityAdjustment = Number(input.quantityAdjustment);
  if (isNaN(quantityAdjustment) || quantityAdjustment === 0) {
    throw new Error('Quantity adjustment must be a non-zero number.');
  }

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { allowNegativeStock: true },
    });

    const product = await tx.product.findFirst({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new Error('Product not found or unauthorized.');
    }

    const previousStock = product.currentStock;
    const newStock = round2(previousStock + quantityAdjustment);

    if (newStock < 0 && !business?.allowNegativeStock) {
      throw new Error(
        `Negative stock prevented: product "${product.name}" only has ${previousStock} ${product.unit} available.`
      );
    }

    // Update product stock
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    // Create StockMovement audit entry
    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        productId: product.id,
        type: StockMovementType.MANUAL_ADJUSTMENT,
        quantity: quantityAdjustment,
        previousStock,
        newStock,
        sourceDocumentType: 'MANUAL_ADJUSTMENT',
        sourceDocumentId: product.id,
        reason: input.reason.trim() || 'Manual stock adjustment',
        actorName: input.actorName || 'Staff',
      },
    });

    return { product: updatedProduct, movement };
  });
}

/**
 * Get stock movements audit ledger across products
 */
export async function getStockMovements(
  businessId: string,
  options?: {
    productId?: string;
    type?: StockMovementType;
    limit?: number;
  }
) {
  const where: any = { businessId };
  if (options?.productId) where.productId = options.productId;
  if (options?.type) where.type = options.type;

  return prisma.stockMovement.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });
}

/**
 * Calculate total inventory valuation and health KPIs
 */
export async function getInventoryValuation(businessId: string) {
  const products = await prisma.product.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      currentStock: true,
      lowStockAlert: true,
      purchasePrice: true,
      sellingPrice: true,
      unit: true,
    },
  });

  let totalItems = products.length;
  let totalStockUnits = 0;
  let totalValuationCost = 0;
  let totalValuationRetail = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of products) {
    totalStockUnits += p.currentStock;
    totalValuationCost += Math.max(0, p.currentStock) * p.purchasePrice;
    totalValuationRetail += Math.max(0, p.currentStock) * p.sellingPrice;

    if (p.currentStock <= 0) {
      outOfStockCount++;
    } else if (p.currentStock <= p.lowStockAlert) {
      lowStockCount++;
    }
  }

  return {
    totalItems,
    totalStockUnits: round2(totalStockUnits),
    totalValuationCost: round2(totalValuationCost),
    totalValuationRetail: round2(totalValuationRetail),
    potentialProfit: round2(totalValuationRetail - totalValuationCost),
    lowStockCount,
    outOfStockCount,
  };
}

/**
 * Parse CSV text and perform row-level validation
 */
export function parseAndValidateCsv(
  csvText: string,
  existingSkus: Set<string>
): {
  validRows: CsvProductRow[];
  errors: CsvRowValidationError[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          field: 'file',
          message: 'CSV file must have a header row and at least one data row.',
          raw: {},
        },
      ],
    };
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  const headerMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (cols: string[], possibleNames: string[]): string => {
    for (const name of possibleNames) {
      const idx = headerMap[name];
      if (idx !== undefined && cols[idx] !== undefined) {
        return cols[idx].trim().replace(/^["']|["']$/g, '');
      }
    }
    return '';
  };

  const validRows: CsvProductRow[] = [];
  const errors: CsvRowValidationError[] = [];
  const seenSkusInFile = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(',').map((c) => c.trim());
    const rawObj: Record<string, string> = { line: rawLine };

    const name = getCol(cols, ['name', 'productname', 'itemname']);
    const sku = getCol(cols, ['sku', 'itemcode', 'code']);
    const barcode = getCol(cols, ['barcode', 'upc', 'ean']);
    const category = getCol(cols, ['category', 'group']) || 'General';
    const unit = getCol(cols, ['unit', 'uom']) || 'Pcs';
    const purchasePriceStr = getCol(cols, ['purchaseprice', 'costprice', 'cost', 'buyprice']);
    const sellingPriceStr = getCol(cols, ['sellingprice', 'salesprice', 'mrp', 'rate']);
    const taxRateStr = getCol(cols, ['taxrate', 'gst', 'gstpercent', 'tax']);
    const openingStockStr = getCol(cols, ['openingstock', 'stock', 'qty', 'quantity']);
    const lowStockAlertStr = getCol(cols, ['lowstockalert', 'minstock', 'reorderlevel', 'alertlevel']);
    const description = getCol(cols, ['description', 'notes']);

    if (!name) {
      errors.push({
        row: i + 1,
        field: 'name',
        message: 'Product name is required.',
        raw: rawObj,
      });
      continue;
    }

    if (!sku) {
      errors.push({
        row: i + 1,
        field: 'sku',
        message: 'Product SKU is required.',
        raw: rawObj,
      });
      continue;
    }

    if (seenSkusInFile.has(sku.toLowerCase())) {
      errors.push({
        row: i + 1,
        field: 'sku',
        message: `Duplicate SKU "${sku}" found within the CSV file.`,
        raw: rawObj,
      });
      continue;
    }
    seenSkusInFile.add(sku.toLowerCase());

    if (existingSkus.has(sku.toLowerCase())) {
      errors.push({
        row: i + 1,
        field: 'sku',
        message: `SKU "${sku}" already exists in the business catalog.`,
        raw: rawObj,
      });
      continue;
    }

    const purchasePrice = parseFloat(purchasePriceStr || '0');
    if (isNaN(purchasePrice) || purchasePrice < 0) {
      errors.push({
        row: i + 1,
        field: 'purchasePrice',
        message: `Invalid purchase price: "${purchasePriceStr}". Must be 0 or positive number.`,
        raw: rawObj,
      });
      continue;
    }

    const sellingPrice = parseFloat(sellingPriceStr || '0');
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      errors.push({
        row: i + 1,
        field: 'sellingPrice',
        message: `Invalid selling price: "${sellingPriceStr}". Must be 0 or positive number.`,
        raw: rawObj,
      });
      continue;
    }

    const taxRate = parseFloat(taxRateStr || '0');
    if (isNaN(taxRate) || taxRate < 0) {
      errors.push({
        row: i + 1,
        field: 'taxRate',
        message: `Invalid tax rate: "${taxRateStr}". Must be valid percentage.`,
        raw: rawObj,
      });
      continue;
    }

    const openingStock = parseFloat(openingStockStr || '0');
    if (isNaN(openingStock) || openingStock < 0) {
      errors.push({
        row: i + 1,
        field: 'openingStock',
        message: `Invalid opening stock: "${openingStockStr}". Must be 0 or positive number.`,
        raw: rawObj,
      });
      continue;
    }

    const lowStockAlert = parseFloat(lowStockAlertStr || '10');
    if (isNaN(lowStockAlert) || lowStockAlert < 0) {
      errors.push({
        row: i + 1,
        field: 'lowStockAlert',
        message: `Invalid low stock threshold: "${lowStockAlertStr}".`,
        raw: rawObj,
      });
      continue;
    }

    validRows.push({
      name,
      sku,
      barcode: barcode || undefined,
      category,
      unit,
      purchasePrice: round2(purchasePrice),
      sellingPrice: round2(sellingPrice),
      taxRate: round2(taxRate),
      openingStock: round2(openingStock),
      lowStockAlert: round2(lowStockAlert),
      description: description || undefined,
    });
  }

  return { validRows, errors };
}

/**
 * Commit batch of validated CSV rows to database transactionally
 */
export async function commitCsvImport(
  businessId: string,
  validRows: CsvProductRow[],
  actorName = 'CSV Import'
) {
  if (validRows.length === 0) {
    return { count: 0 };
  }

  return prisma.$transaction(async (tx) => {
    let createdCount = 0;

    for (const row of validRows) {
      const product = await tx.product.create({
        data: {
          businessId,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode || null,
          category: row.category || 'General',
          unit: row.unit || 'Pcs',
          purchasePrice: row.purchasePrice,
          sellingPrice: row.sellingPrice,
          taxRate: row.taxRate,
          openingStock: row.openingStock,
          currentStock: row.openingStock,
          lowStockAlert: row.lowStockAlert,
          description: row.description || null,
          isActive: true,
        },
      });

      if (row.openingStock > 0) {
        await tx.stockMovement.create({
          data: {
            businessId,
            productId: product.id,
            type: StockMovementType.OPENING_STOCK,
            quantity: row.openingStock,
            previousStock: 0,
            newStock: row.openingStock,
            sourceDocumentType: 'CSV_IMPORT',
            sourceDocumentId: product.id,
            reason: 'Opening stock imported via CSV',
            actorName,
          },
        });
      }

      createdCount++;
    }

    return { count: createdCount };
  });
}

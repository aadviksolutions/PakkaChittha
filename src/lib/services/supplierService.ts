import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { PurchaseStatus } from '@prisma/client';

export interface CreateSupplierInput {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  openingBalance?: number;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  openingBalance?: number;
  notes?: string | null;
}

/**
 * Fetch all suppliers for a business with real-time payable ledger balance calculation
 */
export async function getSuppliers(businessId: string, query?: string) {
  const where: any = { businessId };

  if (query?.trim()) {
    const q = query.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { gstin: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      purchases: {
        where: { status: PurchaseStatus.RECEIVED },
        select: {
          total: true,
          paidAmount: true,
          balanceDue: true,
          purchaseDate: true,
        },
      },
      payments: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return suppliers.map((s) => {
    // Total payable = Opening balance + sum of balanceDue on all received purchases
    const purchasesBalanceDue = s.purchases.reduce((sum, p) => sum + p.balanceDue, 0);
    const totalOutstanding = round2(s.openingBalance + purchasesBalanceDue);
    const totalPurchasesAmount = round2(s.purchases.reduce((sum, p) => sum + p.total, 0));
    const totalPaidAmount = round2(s.payments.reduce((sum, p) => sum + p.amount, 0));

    const latestPurchase = s.purchases.sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )[0];

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      gstin: s.gstin,
      openingBalance: s.openingBalance,
      notes: s.notes,
      totalOutstanding,
      totalPurchasesAmount,
      totalPaidAmount,
      purchaseCount: s.purchases.length,
      lastPurchaseDate: latestPurchase ? latestPurchase.purchaseDate : null,
      createdAt: s.createdAt,
    };
  });
}

/**
 * Get supplier details by ID with comprehensive purchase and payment ledger history
 */
export async function getSupplierById(businessId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
    include: {
      purchases: {
        include: {
          items: true,
        },
        orderBy: { purchaseDate: 'desc' },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!supplier) {
    return null;
  }

  const receivedPurchases = supplier.purchases.filter((p) => p.status === PurchaseStatus.RECEIVED);
  const purchasesBalanceDue = receivedPurchases.reduce((sum, p) => sum + p.balanceDue, 0);
  const totalOutstanding = round2(supplier.openingBalance + purchasesBalanceDue);
  const totalPurchasesAmount = round2(receivedPurchases.reduce((sum, p) => sum + p.total, 0));
  const totalPaidAmount = round2(supplier.payments.reduce((sum, p) => sum + p.amount, 0));

  return {
    ...supplier,
    totalOutstanding,
    totalPurchasesAmount,
    totalPaidAmount,
  };
}

/**
 * Create a new supplier
 */
export async function createSupplier(businessId: string, data: CreateSupplierInput) {
  const name = data.name.trim();
  const phone = data.phone.trim();
  const openingBalance = round2(Number(data.openingBalance || 0));

  if (!name) throw new Error('Supplier name is required.');
  if (!phone) throw new Error('Supplier phone number is required.');

  return prisma.supplier.create({
    data: {
      businessId,
      name,
      phone,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      gstin: data.gstin?.trim().toUpperCase() || null,
      openingBalance,
      notes: data.notes?.trim() || null,
    },
  });
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(
  businessId: string,
  supplierId: string,
  data: UpdateSupplierInput
) {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });

  if (!existing) {
    throw new Error('Supplier not found or unauthorized.');
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      phone: data.phone !== undefined ? data.phone.trim() : undefined,
      email: data.email !== undefined ? data.email?.trim() || null : undefined,
      address: data.address !== undefined ? data.address?.trim() || null : undefined,
      gstin: data.gstin !== undefined ? data.gstin?.trim().toUpperCase() || null : undefined,
      openingBalance:
        data.openingBalance !== undefined ? round2(Number(data.openingBalance)) : undefined,
      notes: data.notes !== undefined ? data.notes?.trim() || null : undefined,
    },
  });
}

/**
 * Permanently deletes a supplier if no linked purchases or vendor payments exist.
 */
export async function deleteSupplier(businessId: string, supplierId: string) {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });

  if (!existing) {
    throw new Error('Supplier not found or unauthorized.');
  }

  const [purchaseCount, paymentCount] = await Promise.all([
    prisma.purchase.count({ where: { businessId, supplierId } }),
    prisma.supplierPayment.count({ where: { businessId, supplierId } }),
  ]);

  if (purchaseCount > 0 || paymentCount > 0) {
    const linked: string[] = [];
    if (purchaseCount > 0) linked.push(`${purchaseCount} purchase bill(s)`);
    if (paymentCount > 0) linked.push(`${paymentCount} vendor payment(s)`);
    throw new Error(
      `Cannot delete "${existing.name}" because it has linked ${linked.join(', ')}. Delete those records first.`
    );
  }

  await prisma.supplier.delete({
    where: { id: supplierId },
  });

  return { deletedId: supplierId, name: existing.name };
}

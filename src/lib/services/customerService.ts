import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';

import { sanitizePhoneNumber } from '@/lib/whatsapp/formatters';

export interface CustomerInput {
  name: string;
  mobile?: string | null;
  email?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  gstin?: string | null;
  openingBalance?: number;
  notes?: string | null;
  optedOutWhatsApp?: boolean;
}

/**
 * Retrieves all customers belonging strictly to the specified business tenant.
 * Includes calculated outstanding balances derived from active invoices and opening balance.
 */
export async function getCustomers(businessId: string, search?: string) {
  const where: {
    businessId: string;
    OR?: {
      name?: { contains: string; mode: 'insensitive' };
      mobile?: { contains: string; mode: 'insensitive' };
      gstin?: { contains: string; mode: 'insensitive' };
    }[];
  } = { businessId };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { mobile: { contains: q, mode: 'insensitive' } },
      { gstin: { contains: q, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      invoices: {
        where: { status: { not: 'CANCELLED' } },
        select: {
          id: true,
          total: true,
          paidAmount: true,
          balanceDue: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return customers.map((c) => {
    const invoiceTotal = c.invoices.reduce((acc, inv) => acc + inv.total, 0);
    const invoicePaid = c.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const invoiceOutstanding = c.invoices.reduce((acc, inv) => acc + inv.balanceDue, 0);
    const totalOutstanding = round2((c.openingBalance || 0) + invoiceOutstanding);

    return {
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      billingAddress: c.billingAddress,
      shippingAddress: c.shippingAddress,
      gstin: c.gstin,
      openingBalance: c.openingBalance,
      notes: c.notes,
      optedOutWhatsApp: c.optedOutWhatsApp,
      createdAt: c.createdAt,
      invoiceCount: c.invoices.length,
      invoiceTotal: round2(invoiceTotal),
      invoicePaid: round2(invoicePaid),
      totalOutstanding,
    };
  });
}

/**
 * Retrieves customer detail by ID with full transaction ledger history.
 * Strictly verifies business tenant ownership.
 */
export async function getCustomerById(businessId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId,
    },
    include: {
      invoices: {
        orderBy: { invoiceDate: 'desc' },
        include: {
          items: true,
        },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return null;
  }

  const activeInvoices = customer.invoices.filter((i) => i.status !== 'CANCELLED');
  const invoiceTotal = activeInvoices.reduce((acc, inv) => acc + inv.total, 0);
  const invoicePaid = activeInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const invoiceOutstanding = activeInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);
  const totalOutstanding = round2((customer.openingBalance || 0) + invoiceOutstanding);

  return {
    ...customer,
    totalOutstanding,
    invoiceTotal: round2(invoiceTotal),
    invoicePaid: round2(invoicePaid),
  };
}

/**
 * Creates a new customer under the authorized business tenant.
 */
export async function createCustomer(businessId: string, input: CustomerInput) {
  const trimmedName = input.name?.trim();
  const rawMobile = input.mobile?.trim() || '';

  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Customer name must be at least 2 characters.');
  }

  let finalMobile = '';
  if (rawMobile) {
    const sanitized = sanitizePhoneNumber(rawMobile);
    if (!sanitized.isValid) {
      throw new Error(sanitized.error || 'Please enter a valid 10-digit mobile number.');
    }
    const cleanDigits = sanitized.cleanDigits;
    const std10 = cleanDigits.startsWith('91') && cleanDigits.length === 12 ? cleanDigits.slice(2) : cleanDigits;
    finalMobile = std10;

    // Tenant-scoped duplicate check for customer with same mobile
    const existing = await prisma.customer.findFirst({
      where: {
        businessId,
        mobile: {
          in: [rawMobile, cleanDigits, std10, `+91${std10}`, `91${std10}`],
        },
      },
    });

    if (existing) {
      throw new Error(`A customer with mobile "${rawMobile}" already exists in this business (${existing.name}).`);
    }
  }

  // Validate GSTIN if entered
  const trimmedGstin = input.gstin?.replace(/[\s\-\u200B\u00A0]/g, '').trim().toUpperCase() || null;
  if (trimmedGstin) {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;
    if (!gstinRegex.test(trimmedGstin)) {
      throw new Error('Invalid GSTIN format. Expected standard 15-character Indian GSTIN (e.g. 22AAAAA0000A1Z5).');
    }
  }

  // Validate email if entered
  const trimmedEmail = input.email?.trim().toLowerCase() || null;
  if (trimmedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Please enter a valid email address.');
    }
  }

  const openingBalance = round2(Number(input.openingBalance) || 0);

  return prisma.customer.create({
    data: {
      businessId,
      name: trimmedName,
      mobile: finalMobile,
      email: trimmedEmail,
      billingAddress: input.billingAddress?.trim() || null,
      shippingAddress: input.shippingAddress?.trim() || null,
      gstin: trimmedGstin,
      openingBalance,
      notes: input.notes?.trim() || null,
      optedOutWhatsApp: input.optedOutWhatsApp ?? false,
    },
  });
}

/**
 * Updates customer details under the authorized business tenant.
 */
export async function updateCustomer(
  businessId: string,
  customerId: string,
  input: Partial<CustomerInput>
) {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new Error('Customer not found or unauthorized.');
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      name: input.name ? input.name.trim() : undefined,
      mobile: input.mobile ? input.mobile.trim() : undefined,
      email: input.email !== undefined ? (input.email ? input.email.trim().toLowerCase() : null) : undefined,
      billingAddress: input.billingAddress !== undefined ? input.billingAddress?.trim() || null : undefined,
      shippingAddress: input.shippingAddress !== undefined ? input.shippingAddress?.trim() || null : undefined,
      gstin: input.gstin !== undefined ? (input.gstin ? input.gstin.trim().toUpperCase() : null) : undefined,
      openingBalance: input.openingBalance !== undefined ? round2(Number(input.openingBalance)) : undefined,
      notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
      optedOutWhatsApp: input.optedOutWhatsApp !== undefined ? input.optedOutWhatsApp : undefined,
    },
  });
}

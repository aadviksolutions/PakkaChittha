import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';
import { PurchaseStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export interface PartyMatch {
  id: string;
  name: string;
  phone: string | null;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'KHATA_CONTACT';
  partyTypeLabel: string;
  currentBalance: number;
  balanceLabel: string;
  isExactMatch: boolean;
  score: number;
}

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('name')?.trim() || '';
    const transactionType = searchParams.get('type') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const lowerQuery = query.toLowerCase();

    // Query Customers, Suppliers and Khata Contacts in parallel with outstanding balance
    const [customers, suppliers, khataContacts] = await Promise.all([
      prisma.customer.findMany({
        where: {
          businessId: business.id,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 10,
        select: {
          id: true,
          name: true,
          mobile: true,
          openingBalance: true,
          invoices: {
            where: { status: { not: 'CANCELLED' } },
            select: { balanceDue: true },
          },
        },
      }),
      prisma.supplier.findMany({
        where: {
          businessId: business.id,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 10,
        select: {
          id: true,
          name: true,
          phone: true,
          openingBalance: true,
          purchases: {
            where: { status: PurchaseStatus.RECEIVED },
            select: { balanceDue: true },
          },
        },
      }),
      prisma.khataContact.findMany({
        where: {
          businessId: business.id,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 10,
        select: {
          id: true,
          name: true,
          phone: true,
          transactions: {
            select: { type: true, amount: true },
          },
        },
      }),
    ]);

    const matches: PartyMatch[] = [];

    // Calculate Customer balance: Opening Balance + unpaid invoice balanceDue
    customers.forEach((c) => {
      const invDue = c.invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
      const totalOutstanding = round2((c.openingBalance || 0) + invDue);
      const isExact = c.name.toLowerCase() === lowerQuery;
      
      matches.push({
        id: c.id,
        name: c.name,
        phone: c.mobile,
        partyType: 'CUSTOMER',
        partyTypeLabel: 'Customer (ग्राहक)',
        currentBalance: totalOutstanding,
        balanceLabel: totalOutstanding > 0 ? `₹${totalOutstanding.toLocaleString('en-IN')} Due` : '₹0',
        isExactMatch: isExact,
        score: isExact ? 100 : (transactionType === 'SALE' || transactionType === 'PAYMENT_RECEIVED' || transactionType === 'TO_RECEIVE' ? 85 : 70),
      });
    });

    // Calculate Supplier balance: Opening Balance + unpaid purchase balanceDue
    suppliers.forEach((s) => {
      const purDue = s.purchases.reduce((acc, pur) => acc + (pur.balanceDue || 0), 0);
      const totalOutstanding = round2((s.openingBalance || 0) + purDue);
      const isExact = s.name.toLowerCase() === lowerQuery;

      matches.push({
        id: s.id,
        name: s.name,
        phone: s.phone,
        partyType: 'SUPPLIER',
        partyTypeLabel: 'Supplier (सप्लायर)',
        currentBalance: totalOutstanding,
        balanceLabel: totalOutstanding > 0 ? `₹${totalOutstanding.toLocaleString('en-IN')} Payable` : '₹0',
        isExactMatch: isExact,
        score: isExact ? 100 : (transactionType === 'PURCHASE' || transactionType === 'PAYMENT_GIVEN' || transactionType === 'TO_PAY' ? 85 : 60),
      });
    });

    // Calculate Khata Contact balance
    khataContacts.forEach((kc) => {
      const given = kc.transactions
        .filter((t) => t.type === 'GAVE')
        .reduce((sum, t) => sum + t.amount, 0);
      const got = kc.transactions
        .filter((t) => t.type === 'RECEIVED')
        .reduce((sum, t) => sum + t.amount, 0);
      const net = round2(given - got);
      const isExact = kc.name.toLowerCase() === lowerQuery;

      matches.push({
        id: kc.id,
        name: kc.name,
        phone: kc.phone,
        partyType: 'KHATA_CONTACT',
        partyTypeLabel: 'Khata Contact (खाता संपर्क)',
        currentBalance: net,
        balanceLabel: net > 0 ? `₹${net.toLocaleString('en-IN')} To Receive` : net < 0 ? `₹${Math.abs(net).toLocaleString('en-IN')} To Pay` : '₹0',
        isExactMatch: isExact,
        score: isExact ? 95 : 65,
      });
    });

    // Sort by score desc, then by exact match
    matches.sort((a, b) => {
      if (b.isExactMatch && !a.isExactMatch) return 1;
      if (!b.isExactMatch && a.isExactMatch) return -1;
      return b.score - a.score;
    });

    return NextResponse.json({
      success: true,
      matches,
      exactMatchFound: matches.some((m) => m.isExactMatch),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to search parties.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

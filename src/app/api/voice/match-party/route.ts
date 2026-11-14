import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    // Query Customers, Suppliers and Khata Contacts in parallel
    const [customers, suppliers, khataContacts] = await Promise.all([
      prisma.customer.findMany({
        where: {
          businessId: business.id,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      }),
      prisma.supplier.findMany({
        where: {
          businessId: business.id,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
        },
      }),
      prisma.khataContact.findMany({
        where: {
          businessId: business.id,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
        },
      }),
    ]);

    interface PartyMatch {
      id: string;
      name: string;
      phone: string | null;
      partyType: 'CUSTOMER' | 'SUPPLIER' | 'KHATA_CONTACT';
      partyTypeLabel: string;
      isExactMatch: boolean;
      score: number;
    }

    const matches: PartyMatch[] = [];

    // Prioritize based on transactionType
    // e.g. PURCHASE / PAYMENT_GIVEN prefers SUPPLIER or KHATA_CONTACT
    // e.g. SALE / PAYMENT_RECEIVED / TO_RECEIVE prefers CUSTOMER or KHATA_CONTACT

    customers.forEach((c) => {
      const isExact = c.name.toLowerCase() === lowerQuery;
      matches.push({
        id: c.id,
        name: c.name,
        phone: c.mobile,
        partyType: 'CUSTOMER',
        partyTypeLabel: 'Customer (ग्राहक)',
        isExactMatch: isExact,
        score: isExact ? 100 : 70,
      });
    });

    suppliers.forEach((s) => {
      const isExact = s.name.toLowerCase() === lowerQuery;
      matches.push({
        id: s.id,
        name: s.name,
        phone: s.phone,
        partyType: 'SUPPLIER',
        partyTypeLabel: 'Supplier (सप्लायर/व्यापारी)',
        isExactMatch: isExact,
        score: isExact ? 100 : (transactionType === 'PURCHASE' || transactionType === 'PAYMENT_GIVEN' ? 80 : 60),
      });
    });

    khataContacts.forEach((kc) => {
      const isExact = kc.name.toLowerCase() === lowerQuery;
      matches.push({
        id: kc.id,
        name: kc.name,
        phone: kc.phone,
        partyType: 'KHATA_CONTACT',
        partyTypeLabel: 'Khata Contact (खाता संपर्क)',
        isExactMatch: isExact,
        score: isExact ? 95 : 65,
      });
    });

    // Sort by score desc
    matches.sort((a, b) => b.score - a.score);

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


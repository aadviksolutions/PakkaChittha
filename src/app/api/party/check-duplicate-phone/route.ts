import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';
import { sanitizePhoneNumber } from '@/lib/whatsapp/formatters';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone')?.trim() || '';
    const excludeId = searchParams.get('excludeId')?.trim() || undefined;
    const excludeType = searchParams.get('excludeType')?.trim()?.toUpperCase() || undefined;

    if (!rawPhone || rawPhone.length < 5) {
      return NextResponse.json({ hasDuplicate: false, matches: [] });
    }

    // Normalize phone number
    const sanitized = sanitizePhoneNumber(rawPhone);
    const cleanDigits = sanitized.cleanDigits || rawPhone.replace(/\D/g, '');
    const std10 = cleanDigits.startsWith('91') && cleanDigits.length === 12 
      ? cleanDigits.slice(2) 
      : cleanDigits.length === 11 && cleanDigits.startsWith('0') 
        ? cleanDigits.slice(1) 
        : cleanDigits;

    const possibleMatches = Array.from(new Set([
      rawPhone,
      cleanDigits,
      std10,
      `+91${std10}`,
      `91${std10}`,
      `0${std10}`,
    ])).filter(Boolean);

    // Search Customers and Suppliers in parallel
    const [matchingCustomers, matchingSuppliers] = await Promise.all([
      prisma.customer.findMany({
        where: {
          businessId: business.id,
          ...(excludeType === 'CUSTOMER' && excludeId ? { id: { not: excludeId } } : {}),
          OR: [
            { mobile: { in: possibleMatches } },
            ...(std10.length >= 10 ? [{ mobile: { contains: std10 } }] : []),
          ],
        },
        select: {
          id: true,
          name: true,
          mobile: true,
        },
        take: 10,
      }),
      prisma.supplier.findMany({
        where: {
          businessId: business.id,
          ...(excludeType === 'SUPPLIER' && excludeId ? { id: { not: excludeId } } : {}),
          OR: [
            { phone: { in: possibleMatches } },
            ...(std10.length >= 10 ? [{ phone: { contains: std10 } }] : []),
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
        take: 10,
      }),
    ]);

    interface DuplicatePartyMatch {
      id: string;
      name: string;
      phone: string;
      type: 'Customer' | 'Supplier';
    }

    const matches: DuplicatePartyMatch[] = [
      ...matchingCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.mobile,
        type: 'Customer' as const,
      })),
      ...matchingSuppliers.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        type: 'Supplier' as const,
      })),
    ];

    return NextResponse.json({
      hasDuplicate: matches.length > 0,
      matches,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error checking duplicate phone';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

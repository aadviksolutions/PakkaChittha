import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/auth/guards';
import prisma from '@/lib/prisma';
import { round2 } from '@/lib/billing/calculator';

export const dynamic = 'force-dynamic';

interface IncomingItem {
  spokenName: string;
  quantity: number;
  unit?: string;
  rate?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { business } = await requireTenantAccess();
    const body = await req.json();
    const items: IncomingItem[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, matchedItems: [] });
    }

    // Fetch all active products for this business
    const allProducts = await prisma.product.findMany({
      where: {
        businessId: business.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        sellingPrice: true,
        taxRate: true,
        hsnCode: true,
        currentStock: true,
      },
    });

    const matchedItems = items.map((item) => {
      const cleanSpoken = item.spokenName.trim().toLowerCase();
      const spokenWords = cleanSpoken.split(/\s+/).filter((w) => w.length > 1);

      // Scoring candidate matches
      let bestMatch: (typeof allProducts)[0] | null = null;
      let highestScore = 0;

      for (const prod of allProducts) {
        const prodNameLower = prod.name.toLowerCase();
        let score = 0;

        // 1. Exact match
        if (prodNameLower === cleanSpoken) {
          score = 100;
        }
        // 2. Contains full spoken string
        else if (prodNameLower.includes(cleanSpoken) || cleanSpoken.includes(prodNameLower)) {
          score = 80;
        }
        // 3. Word-level overlap
        else {
          const matchedWords = spokenWords.filter((w) => prodNameLower.includes(w));
          if (matchedWords.length > 0) {
            score = (matchedWords.length / Math.max(spokenWords.length, 1)) * 60;
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = prod;
        }
      }

      // If matched with sufficient confidence
      if (bestMatch && highestScore >= 50) {
        const rate = bestMatch.sellingPrice;
        const qty = item.quantity || 1;
        const lineTotal = round2(qty * rate);

        return {
          matched: true,
          productId: bestMatch.id,
          name: bestMatch.name,
          spokenName: item.spokenName,
          quantity: qty,
          unit: bestMatch.unit || item.unit || 'Pcs',
          rate,
          taxRate: bestMatch.taxRate || 0,
          hsnCode: bestMatch.hsnCode || null,
          currentStock: bestMatch.currentStock,
          lineTotal,
          matchScore: highestScore,
        };
      }

      // If not in catalog, preserve user's quantity and unit, but do NOT invent rate!
      const rate = typeof item.rate === 'number' && item.rate > 0 ? item.rate : 0;
      const qty = item.quantity || 1;
      return {
        matched: false,
        productId: null,
        name: item.spokenName,
        spokenName: item.spokenName,
        quantity: qty,
        unit: item.unit || 'Pcs',
        rate,
        taxRate: 0,
        hsnCode: null,
        currentStock: 0,
        lineTotal: round2(qty * rate),
        needsRateInput: rate === 0,
        matchScore: 0,
      };
    });

    return NextResponse.json({
      success: true,
      matchedItems,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to match products.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

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
  isFromAmount?: boolean;
}

export interface ProductSuggestion {
  id: string;
  name: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  matchScore: number;
}

// Common Hindi <-> English commercial commodity synonyms
const COMMODITY_SYNONYMS: Record<string, string[]> = {
  sugar: ['chini', 'cheeni', 'shakkar', 'चीनी', 'शक्कर', 'sugar'],
  chini: ['sugar', 'cheeni', 'shakkar', 'चीनी', 'शक्कर', 'sugar'],
  cheeni: ['sugar', 'chini', 'shakkar', 'चीनी', 'sugar'],
  'चीनी': ['sugar', 'chini', 'cheeni', 'shakkar'],
  rice: ['chawal', 'chaawal', 'चावल', 'rice'],
  chawal: ['rice', 'chaawal', 'चावल', 'rice'],
  chaawal: ['rice', 'chawal', 'चावल'],
  'चावल': ['rice', 'chawal', 'chaawal'],
  oil: ['tel', 'tail', 'refined', 'mustard', 'sarso', 'तेल', 'सरसों', 'oil'],
  tel: ['oil', 'refined', 'mustard', 'तेल', 'oil'],
  'तेल': ['oil', 'tel', 'refined'],
  tea: ['chai', 'chay', 'चाय', 'tea'],
  chai: ['tea', 'chay', 'चाय', 'tea'],
  'चाय': ['tea', 'chai', 'chay'],
  salt: ['namak', 'नमक', 'salt'],
  namak: ['salt', 'नमक', 'salt'],
  'नमक': ['salt', 'namak'],
  flour: ['atta', 'aata', 'maida', 'gehu', 'आटा', 'flour'],
  atta: ['flour', 'wheat', 'aata', 'gehu', 'आटा', 'flour'],
  aata: ['flour', 'wheat', 'atta', 'आटा', 'flour'],
  'आटा': ['flour', 'atta', 'aata', 'wheat'],
  biscuit: ['biscuits', 'cookie', 'cookies', 'बिस्कुट', 'biscuit'],
  biscuits: ['biscuit', 'cookie', 'cookies', 'बिस्कुट'],
  'बिस्कुट': ['biscuit', 'biscuits'],
  soap: ['sabun', 'साबुन', 'soap'],
  sabun: ['soap', 'साबुन', 'soap'],
  'साबुन': ['soap', 'sabun'],
  milk: ['doodh', 'dudha', 'दूध', 'milk'],
  doodh: ['milk', 'दूध', 'milk'],
  'दूध': ['milk', 'doodh'],
  dal: ['daal', 'pulses', 'दाल', 'dal'],
  daal: ['dal', 'pulses', 'दाल', 'daal'],
  'दाल': ['dal', 'daal', 'pulses'],
};

/**
 * Expand words with their known synonyms
 */
function getExpandedQueryTerms(cleanSpoken: string): string[] {
  const terms = new Set<string>();
  terms.add(cleanSpoken);

  const words = cleanSpoken.split(/\s+/).filter((w) => w.length > 1);
  words.forEach((w) => {
    terms.add(w);
    const syns = COMMODITY_SYNONYMS[w];
    if (syns) {
      syns.forEach((s) => terms.add(s.toLowerCase()));
    }
  });

  return Array.from(terms);
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
      const expandedTerms = getExpandedQueryTerms(cleanSpoken);
      const spokenWords = cleanSpoken.split(/\s+/).filter((w) => w.length > 1);

      // Scoring candidate matches & collecting suggestions
      const candidates: Array<{ prod: (typeof allProducts)[0]; score: number }> = [];

      for (const prod of allProducts) {
        const prodNameLower = prod.name.toLowerCase();
        let score = 0;

        // 1. Exact match
        if (prodNameLower === cleanSpoken) {
          score = 100;
        }
        // 2. Direct substring match
        else if (prodNameLower.includes(cleanSpoken) || cleanSpoken.includes(prodNameLower)) {
          score = 80;
        }
        // 3. Synonym match
        else {
          let synonymHit = false;
          for (const term of expandedTerms) {
            if (prodNameLower.includes(term) || term.includes(prodNameLower)) {
              score = Math.max(score, 75);
              synonymHit = true;
            }
          }

          // 4. Word-level overlap
          if (!synonymHit) {
            const matchedWords = spokenWords.filter((w) => prodNameLower.includes(w));
            if (matchedWords.length > 0) {
              score = (matchedWords.length / Math.max(spokenWords.length, 1)) * 60;
            }
          }
        }

        if (score >= 40) {
          candidates.push({ prod, score });
        }
      }

      // Sort candidates by score descending
      candidates.sort((a, b) => b.score - a.score);

      const best = candidates[0];
      const suggestions: ProductSuggestion[] = candidates.slice(0, 5).map((c) => ({
        id: c.prod.id,
        name: c.prod.name,
        unit: c.prod.unit,
        sellingPrice: c.prod.sellingPrice,
        currentStock: c.prod.currentStock,
        matchScore: c.score,
      }));

      // If matched with sufficient confidence
      if (best && best.score >= 50) {
        // If rate was explicitly spoken (or came from amount-based sale), prioritize it over catalog if user provided it
        const rate =
          typeof item.rate === 'number' && item.rate > 0
            ? item.rate
            : best.prod.sellingPrice;
        const qty = item.quantity || 1;
        const lineTotal = round2(qty * rate);

        return {
          matched: true,
          productId: best.prod.id,
          name: best.prod.name,
          spokenName: item.spokenName,
          quantity: qty,
          unit: best.prod.unit || item.unit || 'Pcs',
          rate,
          taxRate: best.prod.taxRate || 0,
          hsnCode: best.prod.hsnCode || null,
          currentStock: best.prod.currentStock,
          lineTotal,
          matchScore: best.score,
          suggestions,
          needsRateInput: rate === 0,
        };
      }

      // If not in catalog, preserve user's quantity and spoken rate, but DO NOT auto-create product in catalog!
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
        suggestions,
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

import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Returns current Indian Fiscal Year string (e.g. "2026-27").
 * In India, fiscal year runs from April 1 to March 31.
 */
export function getFiscalYear(date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
  const year = date.getFullYear();

  if (month >= 3) {
    // April or later
    const nextYearShort = String((year + 1) % 100).padStart(2, '0');
    return `${year}-${nextYearShort}`;
  } else {
    // Jan to March: belongs to previous year's FY
    const prevYear = year - 1;
    const currentYearShort = String(year % 100).padStart(2, '0');
    return `${prevYear}-${currentYearShort}`;
  }
}

/**
 * Concurrency-safe sequential invoice number generator.
 * Operates on Prisma Client or inside a Prisma transaction, performing an atomic update/increment
 * on the business's InvoiceSequence record.
 */
export async function generateInvoiceNumber(
  client: Prisma.TransactionClient | PrismaClient,
  businessId: string,
  prefix = 'INV'
): Promise<string> {
  const fiscalYear = getFiscalYear();

  // Atomically upsert and increment sequence counter
  const sequence = await client.invoiceSequence.upsert({
    where: { businessId },
    update: {
      currentNumber: {
        increment: 1,
      },
      fiscalYear,
    },
    create: {
      businessId,
      prefix,
      fiscalYear,
      currentNumber: 1,
    },
  });

  const paddedNum = String(sequence.currentNumber).padStart(4, '0');
  return `${prefix}-${fiscalYear}-${paddedNum}`;
}

/**
 * Concurrency-safe sequential quotation number generator.
 */
export async function generateQuotationNumber(
  client: Prisma.TransactionClient | PrismaClient,
  businessId: string,
  prefix = 'QTN'
): Promise<string> {
  const fiscalYear = getFiscalYear();

  const sequence = await client.quotationSequence.upsert({
    where: { businessId },
    update: {
      currentNumber: {
        increment: 1,
      },
      fiscalYear,
    },
    create: {
      businessId,
      prefix,
      fiscalYear,
      currentNumber: 1,
    },
  });

  const paddedNum = String(sequence.currentNumber).padStart(4, '0');
  return `${prefix}-${fiscalYear}-${paddedNum}`;
}


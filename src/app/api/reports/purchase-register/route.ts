import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { resolveDateFilterRange } from '@/lib/reports/financialYear';
import { getPurchaseRegister } from '@/lib/reports/accountingEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireGrowthAccess();
    const businessId = authContext.business.id;

    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financialYear');
    const periodType = (searchParams.get('periodType') as any) || 'FY';
    const periodValue = searchParams.get('periodValue');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supplierGstin = searchParams.get('supplierGstin') || undefined;
    const itcEligibility = searchParams.get('itcEligibility') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const format = searchParams.get('format') || 'json';

    const filterRange = resolveDateFilterRange({
      financialYear,
      periodType,
      periodValue,
      startDate,
      endDate,
    });

    const result = await getPurchaseRegister(businessId, filterRange, {
      supplierGstin,
      itcEligibility,
      status,
      search,
    });

    if (format === 'csv') {
      const headers = [
        'Purchase Order No',
        'Supplier Invoice No',
        'Purchase Date',
        'Supplier Name',
        'Supplier Phone',
        'Supplier GSTIN',
        'Place Of Supply',
        'Status',
        'Payment Status',
        'ITC Eligibility',
        'Taxable Value',
        'Discount Total',
        'CGST',
        'SGST',
        'IGST',
        'Total Tax',
        'Grand Total',
        'Paid Amount',
        'Balance Due',
      ];

      const rows = result.items.map((i) => [
        `"${i.purchaseNumber}"`,
        `"${i.supplierInvoiceNumber || ''}"`,
        `"${i.purchaseDate.split('T')[0]}"`,
        `"${i.supplierName.replace(/"/g, '""')}"`,
        `"${i.supplierPhone}"`,
        `"${i.supplierGstin || ''}"`,
        `"${i.placeOfSupply}"`,
        `"${i.status}"`,
        `"${i.paymentStatus}"`,
        `"${i.itcEligibility}"`,
        i.subtotal.toFixed(2),
        i.discountTotal.toFixed(2),
        i.cgstTotal.toFixed(2),
        i.sgstTotal.toFixed(2),
        i.igstTotal.toFixed(2),
        i.taxTotal.toFixed(2),
        i.total.toFixed(2),
        i.paidAmount.toFixed(2),
        i.balanceDue.toFixed(2),
      ]);

      const csvSections = [
        `"PURCHASE REGISTER & INPUT TAX CREDIT (ITC) REPORT - ${filterRange.label}"`,
        `"Generated At:","${new Date().toISOString()}"`,
        `"Total Purchases:","${result.summary.totalPurchases}","Taxable Value:","${result.summary.taxableValue}","Total Tax:","${result.summary.taxTotal}"`,
        `"Eligible ITC:","${result.summary.eligibleItcTotal}","Ineligible/Blocked ITC:","${result.summary.ineligibleItcTotal}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ];

      const csvContent = csvSections.join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="purchase_register_${filterRange.financialYear}_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filter: filterRange,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Purchase Register error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate Purchase Register';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

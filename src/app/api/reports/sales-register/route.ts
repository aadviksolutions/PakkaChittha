import { NextRequest, NextResponse } from 'next/server';
import { requireGrowthAccess } from '@/lib/auth/guards';
import { resolveDateFilterRange } from '@/lib/reports/financialYear';
import { getSalesRegister } from '@/lib/reports/accountingEngine';

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

    const taxRateParam = searchParams.get('taxRate');
    const taxRate = taxRateParam ? parseFloat(taxRateParam) : undefined;
    const customerType = searchParams.get('customerType') as 'B2B' | 'B2C' | undefined;
    const placeOfSupply = searchParams.get('placeOfSupply') || undefined;
    const search = searchParams.get('search') || undefined;
    const format = searchParams.get('format') || 'json';

    const filterRange = resolveDateFilterRange({
      financialYear,
      periodType,
      periodValue,
      startDate,
      endDate,
    });

    const result = await getSalesRegister(businessId, filterRange, {
      taxRate,
      customerType: customerType && customerType !== ('ALL' as any) ? customerType : undefined,
      placeOfSupply,
      search,
    });

    if (format === 'csv') {
      const headers = [
        'Invoice Number',
        'Invoice Date',
        'Due Date',
        'Status',
        'Customer Name',
        'Customer Mobile',
        'Customer GSTIN',
        'Customer Type',
        'Place Of Supply',
        'Inter-State',
        'Taxable Value',
        'Discount Total',
        'CGST',
        'SGST',
        'IGST',
        'Rounding',
        'Total Amount',
        'Paid Amount',
        'Balance Due',
      ];

      const rows = result.items.map((i) => [
        `"${i.invoiceNumber}"`,
        `"${i.invoiceDate.split('T')[0]}"`,
        `"${i.dueDate.split('T')[0]}"`,
        `"${i.status}"`,
        `"${i.customerName.replace(/"/g, '""')}"`,
        `"${i.customerMobile}"`,
        `"${i.customerGstin || ''}"`,
        `"${i.customerType}"`,
        `"${i.placeOfSupply}"`,
        `"${i.isInterState ? 'YES' : 'NO'}"`,
        i.subtotal.toFixed(2),
        i.discountTotal.toFixed(2),
        i.cgstTotal.toFixed(2),
        i.sgstTotal.toFixed(2),
        i.igstTotal.toFixed(2),
        i.rounding.toFixed(2),
        i.total.toFixed(2),
        i.paidAmount.toFixed(2),
        i.balanceDue.toFixed(2),
      ]);

      // Append HSN Summary section at the bottom of CSV
      const csvSections = [
        `"SALES REGISTER REPORT - ${filterRange.label}"`,
        `"Generated At:","${new Date().toISOString()}"`,
        `"Total Invoices:","${result.summary.totalInvoices}","Taxable Value:","${result.summary.taxableValue}","Grand Total:","${result.summary.grandTotal}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
        '',
        '"--- HSN / SAC SUMMARY ---"',
        '"HSN/SAC","Description","UQC","Quantity","Tax Rate","Taxable Value","CGST","SGST","IGST","Total Value"',
        ...result.hsnSummary.map((h) =>
          [
            `"${h.hsnCode}"`,
            `"${h.description.replace(/"/g, '""')}"`,
            `"${h.uqc}"`,
            h.totalQuantity.toFixed(2),
            h.taxRate.toFixed(2),
            h.taxableValue.toFixed(2),
            h.cgstAmount.toFixed(2),
            h.sgstAmount.toFixed(2),
            h.igstAmount.toFixed(2),
            h.totalValue.toFixed(2),
          ].join(',')
        ),
      ];

      const csvContent = csvSections.join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="sales_register_${filterRange.financialYear}_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filter: filterRange,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Sales Register error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate Sales Register';
    const status = (error as any)?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

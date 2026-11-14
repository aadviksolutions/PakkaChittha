import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireCommercialAccess } from '@/lib/auth/guards';
import { InvoiceStatus, PurchaseStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireCommercialAccess();
    const businessId = authContext.business.id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Parallel optimized aggregate queries in native Postgres
    const [
      invoiceAgg,
      todaysInvoiceAgg,
      overdueAgg,
      pendingAgg,
      purchaseAgg,
      expenseAgg,
      recentInvoices,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { businessId, status: { not: InvoiceStatus.CANCELLED } },
        _sum: {
          total: true,
          subtotal: true,
          taxTotal: true,
          cgstTotal: true,
          sgstTotal: true,
          igstTotal: true,
          paidAmount: true,
          balanceDue: true,
        },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId,
          status: { not: InvoiceStatus.CANCELLED },
          invoiceDate: { gte: startOfToday },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId,
          balanceDue: { gt: 0 },
          status: InvoiceStatus.OVERDUE,
        },
        _sum: { balanceDue: true },
      }),
      prisma.invoice.aggregate({
        where: {
          businessId,
          balanceDue: { gt: 0 },
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
        },
        _sum: { balanceDue: true },
        _count: { id: true },
      }),
      prisma.purchase.aggregate({
        where: { businessId, status: { not: PurchaseStatus.CANCELLED } },
        _sum: { total: true, subtotal: true, taxTotal: true },
        _count: { id: true },
      }),
      prisma.expense.aggregate({
        where: { businessId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Only fetch invoices within the 6-month chart window with minimal projection
      prisma.invoice.findMany({
        where: {
          businessId,
          status: { not: InvoiceStatus.CANCELLED },
          invoiceDate: { gte: sixMonthsAgo },
        },
        select: {
          invoiceDate: true,
          total: true,
          paidAmount: true,
        },
      }),
    ]);

    // Aggregate Invoices metrics
    const totalSalesTurnover = invoiceAgg._sum.total || 0;
    const taxableSalesValue = invoiceAgg._sum.subtotal || 0;
    const totalSalesTax = invoiceAgg._sum.taxTotal || 0;
    const totalCgst = invoiceAgg._sum.cgstTotal || 0;
    const totalSgst = invoiceAgg._sum.sgstTotal || 0;
    const totalIgst = invoiceAgg._sum.igstTotal || 0;
    const totalPaidCollections = invoiceAgg._sum.paidAmount || 0;
    const totalUdhaarDue = invoiceAgg._sum.balanceDue || 0;

    const todaysSales = todaysInvoiceAgg._sum.total || 0;
    const todaysBillsCount = todaysInvoiceAgg._count.id || 0;
    const overdueAmount = overdueAgg._sum.balanceDue || 0;

    // Purchase procurement metrics
    const totalProcurement = purchaseAgg._sum.total || 0;
    const taxableProcurement = purchaseAgg._sum.subtotal || 0;
    const totalItcTax = purchaseAgg._sum.taxTotal || 0;

    // Expense overheads
    const totalOverheads = expenseAgg._sum.amount || 0;

    // Net GST liability = Output GST - Input Tax Credit
    const netGstPayable = Math.max(0, totalSalesTax - totalItcTax);

    // Gross Profit = Taxable Sales - Taxable Procurement
    const grossProfit = taxableSalesValue - taxableProcurement;
    // Net Profit = Gross Profit - Overheads
    const netProfit = grossProfit - totalOverheads;

    // Pending Invoices
    const pendingInvoicesCount = pendingAgg._count.id || 0;
    const pendingInvoicesAmount = pendingAgg._sum.balanceDue || 0;

    // 7-Day Live Trend (Daily Sales vs Collections)
    const trendDays: Array<{ date: string; label: string; sales: number; collections: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      trendDays.push({ date: dateStr, label: dayLabel, sales: 0, collections: 0 });
    }

    // 6-Month Trend (Monthly Sales vs Collections)
    const monthlyTrend: Array<{ month: string; label: string; sales: number; collections: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('en-IN', { month: 'short' });
      monthlyTrend.push({ month: monthKey, label: monthLabel, sales: 0, collections: 0 });
    }

    recentInvoices.forEach((inv) => {
      const invDate = new Date(inv.invoiceDate);
      const dateStr = invDate.toISOString().split('T')[0];
      const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;

      const day = trendDays.find((t) => t.date === dateStr);
      if (day) {
        day.sales += inv.total;
        day.collections += inv.paidAmount;
      }

      const m = monthlyTrend.find((item) => item.month === monthKey);
      if (m) {
        m.sales += inv.total;
        m.collections += inv.paidAmount;
      }
    });

    return NextResponse.json({
      summary: {
        totalSalesTurnover,
        taxableSalesValue,
        totalSalesTax,
        totalCgst,
        totalSgst,
        totalIgst,
        totalPaidCollections,
        totalUdhaarDue,
        totalProcurement,
        taxableProcurement,
        totalItcTax,
        netGstPayable,
        totalOverheads,
        grossProfit,
        netProfit,
        todaysSales,
        todaysBillsCount,
        overdueAmount,
        pendingInvoicesCount,
        pendingInvoicesAmount,
        invoiceCount: invoiceAgg._count.id || 0,
        purchaseCount: purchaseAgg._count.id || 0,
        expenseCount: expenseAgg._count.id || 0,
        trendDays,
        monthlyTrend,
      },
      salesRegister: recentInvoices,
    });
  } catch (error: any) {
    const status = error.statusCode || (error.message?.includes('Unauthorized') || error.message?.includes('Authentication') ? 401 : error.message?.includes('Commercial') ? 403 : 500);
    return NextResponse.json(
      { error: error.message || 'Failed to aggregate report data' },
      { status }
    );
  }
}

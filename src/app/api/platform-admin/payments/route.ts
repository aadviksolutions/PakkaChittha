import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const statusFilter = searchParams.get('status') || 'ALL'; // ALL, PENDING, SUCCESS, FAILED, CANCELLED, REFUNDED
    const typeFilter = searchParams.get('type') || 'ALL'; // ALL, SUBSCRIPTION, INVOICE
    const gatewayFilter = searchParams.get('gateway') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // 1. Fetch Subscription Payments (SaaS Billing)
    const subPaymentWhere: any = {};
    if (statusFilter !== 'ALL') {
      subPaymentWhere.status = statusFilter;
    }
    if (gatewayFilter !== 'ALL') {
      subPaymentWhere.gateway = gatewayFilter;
    }
    if (query) {
      subPaymentWhere.OR = [
        { id: { contains: query, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: query, mode: 'insensitive' } },
        { gatewayOrderId: { contains: query, mode: 'insensitive' } },
        { business: { name: { contains: query, mode: 'insensitive' } } },
        { business: { email: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [totalSubPayments, subPayments] = await Promise.all([
      (prisma as any).subscriptionPayment.count({ where: subPaymentWhere }),
      (prisma as any).subscriptionPayment.findMany({
        where: subPaymentWhere,
        skip: typeFilter === 'INVOICE' ? 0 : skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              memberships: {
                take: 1,
                where: { role: 'BUSINESS_OWNER' },
                include: { user: { select: { id: true, email: true, name: true } } },
              },
            },
          },
          subscription: {
            select: { id: true, plan: true, status: true, startDate: true, endDate: true },
          },
        },
      }),
    ]);

    // 2. Fetch Customer Invoice Payments (Retail/B2B Udhaar settlements)
    const invoicePaymentWhere: any = {
      business: { isDemo: false },
    };
    if (query) {
      invoicePaymentWhere.OR = [
        { id: { contains: query, mode: 'insensitive' } },
        { referenceNumber: { contains: query, mode: 'insensitive' } },
        { customer: { name: { contains: query, mode: 'insensitive' } } },
        { business: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const [totalInvoicePayments, invoicePayments] = await Promise.all([
      prisma.payment.count({ where: invoicePaymentWhere }),
      prisma.payment.findMany({
        where: invoicePaymentWhere,
        skip: typeFilter === 'SUBSCRIPTION' ? 0 : skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          business: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, mobile: true } },
          invoice: { select: { id: true, invoiceNumber: true, total: true, status: true } },
        },
      }),
    ]);

    // Format subscription payments
    const formattedSubPayments = subPayments.map((p: any) => {
      const ownerUser = p.business?.memberships?.[0]?.user;
      return {
        id: p.id,
        category: 'SUBSCRIPTION_BILLING',
        businessId: p.businessId,
        businessName: p.business?.name || 'Unknown Store',
        userId: ownerUser?.id || null,
        userEmail: ownerUser?.email || p.business?.email || 'N/A',
        userName: ownerUser?.name || 'Business Owner',
        userPhone: p.business?.phone || null,
        plan: p.plan,
        billingPeriod: p.billingPeriod || 'MONTHLY',
        relatedEntity: `Subscription: ${p.plan} (${p.billingPeriod || 'MONTHLY'})`,
        amount: p.amount,
        currency: p.currency,
        gateway: p.gateway,
        gatewayPaymentId: p.gatewayPaymentId || null,
        gatewayOrderId: p.gatewayOrderId || null,
        gatewayTransactionId: p.gatewayPaymentId || p.gatewayOrderId || 'N/A',
        status: p.status, // SUCCESS, PENDING, FAILED, CANCELLED, REFUNDED
        refundStatus:
          p.refundAmount && p.refundAmount > 0
            ? `Refunded ₹${p.refundAmount}`
            : p.status === 'REFUNDED'
            ? 'Full Refund'
            : 'None',
        refundAmount: p.refundAmount || 0,
        autoPayStatus: 'DISABLED_ONE_TIME',
        subscriptionStartDate: p.subscription?.startDate || null,
        subscriptionEndDate: p.subscription?.endDate || null,
        notes: p.notes,
        reconciledBy: p.reconciledBy,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      };
    });

    // Format invoice payments
    const formattedInvoicePayments = invoicePayments.map((p) => ({
      id: p.id,
      category: 'INVOICE_COLLECTION',
      businessId: p.businessId,
      businessName: p.business.name,
      userId: null,
      userEmail: 'N/A',
      userName: p.customer.name,
      userPhone: p.customer.mobile,
      plan: null,
      billingPeriod: 'ONE_TIME',
      relatedEntity: `Invoice ${p.invoice.invoiceNumber} (${p.customer.name})`,
      amount: p.amount,
      currency: 'INR',
      gateway: p.paymentMethod,
      gatewayPaymentId: p.referenceNumber || null,
      gatewayOrderId: null,
      gatewayTransactionId: p.referenceNumber || 'N/A',
      status: 'SUCCESS', // Invoice payments in LenDen are confirmed receipts
      refundStatus: 'None',
      refundAmount: 0,
      autoPayStatus: 'N/A',
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      notes: p.notes,
      reconciledBy: null,
      createdAt: p.paymentDate,
      paidAt: p.paymentDate,
    }));

    let combined = [];
    let grandTotal = 0;

    if (typeFilter === 'SUBSCRIPTION') {
      combined = formattedSubPayments;
      grandTotal = totalSubPayments;
    } else if (typeFilter === 'INVOICE') {
      combined = formattedInvoicePayments;
      grandTotal = totalInvoicePayments;
    } else {
      combined = [...formattedSubPayments, ...formattedInvoicePayments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      grandTotal = totalSubPayments + totalInvoicePayments;
    }

    // Status counts and financial totals for subscription payments
    const allSubPayments = await (prisma as any).subscriptionPayment.findMany({
      select: { status: true, amount: true, refundAmount: true },
    });

    const totalCollected = allSubPayments
      .filter((p: any) => p.status === 'SUCCESS')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const totalRefunded = allSubPayments.reduce(
      (sum: number, p: any) => sum + (p.refundAmount || 0),
      0
    );

    const statusCounts = {
      all: grandTotal,
      pending: allSubPayments.filter((p: any) => p.status === 'PENDING').length,
      success: allSubPayments.filter((p: any) => p.status === 'SUCCESS').length,
      failed: allSubPayments.filter((p: any) => p.status === 'FAILED').length,
      cancelled: allSubPayments.filter((p: any) => p.status === 'CANCELLED').length,
      refunded: allSubPayments.filter(
        (p: any) => p.status === 'REFUNDED' || (p.refundAmount && p.refundAmount > 0)
      ).length,
      totalCollected,
      totalRefunded,
    };

    return NextResponse.json({
      success: true,
      payments: combined,
      statusCounts,
      pagination: {
        page,
        limit,
        total: grandTotal,
        totalPages: Math.ceil(grandTotal / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

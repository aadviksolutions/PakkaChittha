import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin, AuthError } from '@/lib/auth/guards';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export async function GET() {
  try {
    await requireSuperAdmin();

    const realBizFilter = { isDemo: false, id: { not: { startsWith: 'demo_' } } };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysFuture = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 1. Core platform counts
    const totalUsers = await prisma.user.count({ where: { isDemo: false } });
    const totalBusinesses = await prisma.business.count({ where: realBizFilter });

    // Active users: either active session or created in last 30 days
    const activeSessionsCount = await prisma.session.count({
      where: { expiresAt: { gt: now } },
    });
    const recentUsersCount = await prisma.user.count({
      where: { isDemo: false, createdAt: { gte: thirtyDaysAgo } },
    });
    const activeUsers = Math.max(activeSessionsCount, recentUsersCount);

    // 2. Subscriptions
    const allSubscriptions = await prisma.subscription.findMany({
      where: { business: realBizFilter },
      include: {
        business: {
          select: { id: true, name: true, tradeType: true },
        },
      },
    });

    const activePaidSubs = allSubscriptions.filter(
      (s) =>
        s.status === SubscriptionStatus.ACTIVE &&
        s.plan !== SubscriptionPlan.FREE_KHATA &&
        s.plan !== SubscriptionPlan.FREE_TRIAL
    );

    const freeKhataCount = allSubscriptions.filter(
      (s) => s.plan === SubscriptionPlan.FREE_KHATA
    ).length;

    const trialCount = allSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.TRIALING
    ).length;

    const suspendedCount = allSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.SUSPENDED
    ).length;

    const renewalsDue = allSubscriptions.filter((s) => {
      if (s.status !== SubscriptionStatus.ACTIVE || s.plan === SubscriptionPlan.FREE_KHATA) {
        return false;
      }
      if (!s.endDate) return false;
      return s.endDate >= now && s.endDate <= fourteenDaysFuture;
    }).length;

    // Monthly Recurring Revenue (MRR)
    const mrr = activePaidSubs.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);

    // 3. Subscription Payments
    const allPayments = await (prisma as any).subscriptionPayment.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const pendingPaymentsCount = allPayments.filter((p: any) => p.status === 'PENDING').length;
    const successfulPaymentsCount = allPayments.filter((p: any) => p.status === 'SUCCESS').length;
    const failedPaymentsCount = allPayments.filter((p: any) => p.status === 'FAILED').length;

    const grossRevenue = allPayments
      .filter((p: any) => p.status === 'SUCCESS')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const totalRefunds = allPayments
      .filter((p: any) => p.status === 'REFUNDED' || (p.refundAmount && p.refundAmount > 0))
      .reduce((sum: number, p: any) => sum + (p.refundAmount || p.amount || 0), 0);

    const netCollections = Math.max(0, grossRevenue - totalRefunds);

    // 4. Invoices & Ledger volume
    const totalInvoices = await prisma.invoice.count({
      where: { business: realBizFilter },
    });
    const totalKhataTransactions = await prisma.khataTransaction.count({
      where: { business: realBizFilter },
    });

    // 4b. Ghar Kharcha Household Telemetry (Platform Admin aggregate counts without private descriptions)
    const totalHouseholds = await prisma.household.count();
    const activeHouseholds = await prisma.household.count({ where: { isArchived: false } });
    const archivedHouseholds = await prisma.household.count({ where: { isArchived: true } });
    const totalHouseholdMembers = await prisma.householdMember.count();
    const totalHouseholdTransactions = await prisma.householdTransaction.count();
    const recentHouseholdRegistrations = await prisma.household.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // 5. Recent Audit Activity
    const recentAuditLogs = await (prisma as any).platformAuditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    // 6. Recent Registrations
    const recentUsers = await prisma.user.findMany({
      where: { isDemo: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        isSuspended: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      kpis: {
        totalUsers,
        totalBusinesses,
        activeUsers,
        activePaidSubscriptions: activePaidSubs.length,
        freeKhataAccounts: freeKhataCount,
        trialWorkspaces: trialCount,
        suspendedWorkspaces: suspendedCount,
        pendingPayments: pendingPaymentsCount,
        successfulPayments: successfulPaymentsCount,
        failedPayments: failedPaymentsCount,
        renewalsDue,
        monthlyRecurringRevenue: mrr,
        grossRevenue,
        totalRefunds,
        netCollections,
        totalInvoices,
        totalKhataTransactions,
        // Ghar Kharcha Platform Metrics
        totalHouseholds,
        activeHouseholds,
        archivedHouseholds,
        totalHouseholdMembers,
        totalHouseholdTransactions,
        recentHouseholdRegistrations,
      },
      recentAuditLogs,
      recentUsers,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

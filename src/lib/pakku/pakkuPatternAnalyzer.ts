import { prisma } from '@/lib/prisma';

export interface ClientPatternProfile {
  userName: string;
  userRole: string;
  businessName?: string;
  businessGstin?: string;
  
  // Sales & Revenue Pulse
  todaySales: number;
  todayInvoiceCount: number;
  monthSales: number;
  todayCollections: number;
  
  // Debt & Udhaar Pulse
  totalReceivables: number;
  debtorCount: number;
  topDebtors: Array<{ name: string; balance: number }>;
  
  // Payables Pulse
  totalPayables: number;
  supplierCount: number;
  
  // Inventory Pulse
  totalProducts: number;
  lowStockCount: number;
  lowStockItems: string[];
  topSellingProducts: string[];
  
  // Household / Ghar Kharcha Pulse
  hasHousehold: boolean;
  householdName?: string;
  monthlyBudget: number;
  monthExpenses: number;
  budgetRemaining: number;
  budgetUtilizationPct: number;
  topExpenseCategory?: string;
  
  // Synthesized Pattern & Persona
  businessType: 'RETAIL' | 'WHOLESALE_CREDIT' | 'SERVICE' | 'HOUSEHOLD_FOCUSED' | 'GENERAL';
  healthStatus: 'EXCELLENT' | 'STABLE' | 'NEEDS_ATTENTION' | 'CRITICAL_UDHAAR' | 'LOW_STOCK_WARNING';
  actionableInsights: string[];
}

/**
 * Analyzes the working pattern of the active client across their business and household data
 */
export async function analyzeClientPattern(params: {
  userId: string;
  userName?: string;
  userRole?: string;
  businessId?: string;
  householdId?: string;
}): Promise<ClientPatternProfile> {
  const { userId, userName = 'व्यापारी मित्र', userRole = 'BUSINESS_OWNER', businessId, householdId } = params;

  // Defaults
  const profile: ClientPatternProfile = {
    userName,
    userRole,
    todaySales: 0,
    todayInvoiceCount: 0,
    monthSales: 0,
    todayCollections: 0,
    totalReceivables: 0,
    debtorCount: 0,
    topDebtors: [],
    totalPayables: 0,
    supplierCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    lowStockItems: [],
    topSellingProducts: [],
    hasHousehold: false,
    monthlyBudget: 0,
    monthExpenses: 0,
    budgetRemaining: 0,
    budgetUtilizationPct: 0,
    businessType: 'GENERAL',
    healthStatus: 'STABLE',
    actionableInsights: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // 1. If Business is active, fetch real-time commercial data
  if (businessId) {
    try {
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, gstin: true },
      });
      if (biz) {
        profile.businessName = biz.name;
        profile.businessGstin = biz.gstin || undefined;
      }

      // Today's Invoices
      const todayInvoices = await prisma.invoice.findMany({
        where: {
          businessId,
          createdAt: { gte: startOfToday },
          status: { not: 'CANCELLED' },
        },
        select: { total: true },
      });

      profile.todayInvoiceCount = todayInvoices.length;
      profile.todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

      // Month's Invoices
      const monthInvoices = await prisma.invoice.aggregate({
        where: {
          businessId,
          createdAt: { gte: startOfMonth },
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      });
      profile.monthSales = Number(monthInvoices._sum?.total || 0);

      // Today's Payments Received
      const todayPayments = await prisma.payment.aggregate({
        where: {
          invoice: { businessId },
          paymentDate: { gte: startOfToday },
        },
        _sum: { amount: true },
      });
      profile.todayCollections = Number(todayPayments._sum?.amount || 0);

      // Customer Udhaar (Receivables) from unpaid invoices
      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          businessId,
          balanceDue: { gt: 0 },
          status: { not: 'CANCELLED' },
        },
        select: {
          balanceDue: true,
          customer: { select: { name: true } },
        },
        orderBy: { balanceDue: 'desc' },
        take: 50,
      });

      const debtorMap = new Map<string, number>();
      let totalUdhaar = 0;
      for (const inv of pendingInvoices) {
        const custName = inv.customer?.name || 'Walk-in Customer';
        debtorMap.set(custName, (debtorMap.get(custName) || 0) + Number(inv.balanceDue || 0));
        totalUdhaar += Number(inv.balanceDue || 0);
      }

      profile.totalReceivables = totalUdhaar;
      profile.debtorCount = debtorMap.size;
      profile.topDebtors = Array.from(debtorMap.entries())
        .map(([name, balance]) => ({ name, balance }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5);

      // Supplier Payables
      const payableAgg = await prisma.purchase.aggregate({
        where: {
          businessId,
          balanceDue: { gt: 0 },
        },
        _sum: { balanceDue: true },
        _count: { id: true },
      });
      profile.totalPayables = Number(payableAgg._sum?.balanceDue || 0);
      profile.supplierCount = payableAgg._count?.id || 0;

      // Inventory Health
      const allProducts = await prisma.product.findMany({
        where: { businessId, isActive: true },
        select: { name: true, currentStock: true, lowStockAlert: true },
      });

      profile.totalProducts = allProducts.length;
      const lowStock = allProducts.filter(
        (p) => p.currentStock <= (p.lowStockAlert || 10)
      );
      profile.lowStockCount = lowStock.length;
      profile.lowStockItems = lowStock.slice(0, 4).map((p) => p.name);

      // Top selling products by invoice items
      const topItems = await prisma.invoiceItem.groupBy({
        by: ['description'],
        where: { invoice: { businessId, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 3,
      });
      profile.topSellingProducts = topItems.map((item) => item.description);

      // Classify Business Pattern
      if (profile.totalReceivables > 50000 && profile.debtorCount > 5) {
        profile.businessType = 'WHOLESALE_CREDIT';
      } else if (profile.todayInvoiceCount >= 5 || profile.totalProducts > 20) {
        profile.businessType = 'RETAIL';
      } else {
        profile.businessType = 'GENERAL';
      }

      // Determine Health Status & Insights
      if (profile.totalReceivables > 100000 && profile.totalReceivables > profile.monthSales * 1.5) {
        profile.healthStatus = 'CRITICAL_UDHAAR';
        profile.actionableInsights.push(
          `बाजार में ₹${profile.totalReceivables.toLocaleString('en-IN')} की उधारी फंसी हुई है। शीर्ष बकाएदारों (${profile.topDebtors.map(d => d.name).join(', ')}) को तुरंत व्हाट्सएप पेमेंट रिमाइंडर भेजें!`
        );
      } else if (profile.lowStockCount > 0) {
        profile.healthStatus = 'LOW_STOCK_WARNING';
        profile.actionableInsights.push(
          `${profile.lowStockCount} उत्पादों का स्टॉक खत्म होने वाला है (${profile.lowStockItems.join(', ')}). सप्लायर को नया खरीद ऑर्डर दें!`
        );
      } else if (profile.todaySales > 0) {
        profile.healthStatus = 'EXCELLENT';
        profile.actionableInsights.push(
          `आज की कुल बिक्री ₹${profile.todaySales.toLocaleString('en-IN')} हो चुकी है (${profile.todayInvoiceCount} इनवॉइस)। गति बनाए रखें!`
        );
      }
    } catch (bizErr) {
      console.warn('[Pakku Analyzer] Business metrics error:', bizErr);
    }
  }

  // 2. Household (Ghar Kharcha) pattern analysis
  try {
    let targetHousehold = null;
    if (householdId) {
      targetHousehold = await prisma.household.findUnique({
        where: { id: householdId },
      });
    }

    if (!targetHousehold) {
      targetHousehold = await prisma.household.findFirst({
        where: { members: { some: { userId } } },
      });
    }

    if (targetHousehold) {
      profile.hasHousehold = true;
      profile.householdName = targetHousehold.name;

      const monthYearStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const budgetRecord = await prisma.householdMonthlyBudget.findUnique({
        where: {
          householdId_monthYear: {
            householdId: targetHousehold.id,
            monthYear: monthYearStr,
          },
        },
      });

      profile.monthlyBudget = budgetRecord
        ? Number(budgetRecord.amount)
        : Number(targetHousehold.monthlyBudget || 0);

      // Expenses this month
      const expensesAgg = await prisma.householdTransaction.aggregate({
        where: {
          householdId: targetHousehold.id,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      });

      profile.monthExpenses = Number(expensesAgg._sum?.amount || 0);
      profile.budgetRemaining = Math.max(0, profile.monthlyBudget - profile.monthExpenses);
      profile.budgetUtilizationPct = profile.monthlyBudget > 0
        ? Math.round((profile.monthExpenses / profile.monthlyBudget) * 100)
        : 0;

      // Top expense category
      const topCategory = await prisma.householdTransaction.groupBy({
        by: ['categoryId'],
        where: { householdId: targetHousehold.id, date: { gte: startOfMonth } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      });

      if (topCategory.length > 0 && topCategory[0].categoryId) {
        const cat = await prisma.householdCategory.findUnique({
          where: { id: topCategory[0].categoryId },
          select: { name: true },
        });
        if (cat) {
          profile.topExpenseCategory = cat.name;
        }
      }

      if (profile.budgetUtilizationPct >= 90) {
        profile.actionableInsights.push(
          `घर खर्चा बजट का ${profile.budgetUtilizationPct}% खर्च हो चुका है (शेष: ₹${profile.budgetRemaining.toLocaleString('en-IN')})। महीने के बाकी दिनों के लिए गैर-जरूरी खर्चों पर नियंत्रण रखें!`
        );
      }
    }
  } catch (hhErr) {
    console.warn('[Pakku Analyzer] Household metrics error:', hhErr);
  }

  return profile;
}

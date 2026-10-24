export type BillingInterval = 'MONTHLY' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEARLY';

export type PlanKey = 'FREE_KHATA' | 'STARTER' | 'GROWTH' | 'SCALE';

export interface PlanPricing {
  durationMonths: number;
  totalPrice: number;
  monthlyEquivalent: number;
  savingsAmount: number;
  savingsPercent: number;
}

export interface OfficialPlan {
  id: PlanKey;
  prismaEnum: 'FREE_KHATA' | 'STARTER' | 'GROWTH_PRO' | 'ENTERPRISE';
  name: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  limits: {
    maxUsers: number;
    maxLocations: number;
    maxMonthlyInvoices: number; // 999999 represents Unlimited
    isUnlimitedInvoices: boolean;
  };
  pricing: Record<BillingInterval, PlanPricing>;
  features: string[];
  entitlements: {
    canAccessFreeKhata: boolean;
    canCreateInvoices: boolean;
    canConfigureGst: boolean;
    canGeneratePdf: boolean;
    canManageCustomers: boolean;
    canTrackUdhaar: boolean;
    canRecordPayments: boolean;
    canManualWhatsAppShare: boolean;
    canManageInventoryBasic: boolean;
    canRecordExpenses: boolean;
    canViewBasicDashboard: boolean;
    // Growth features
    canAdvancedCustomerLedger: boolean;
    canOpeningBalances: boolean;
    canManagePurchases: boolean;
    canManageSuppliers: boolean;
    canAdvancedInventory: boolean;
    canLowStockAlerts: boolean;
    canAdvancedReports: boolean;
    canCustomLogoInvoice: boolean;
    canCustomerStatements: boolean;
    canBulkExport: boolean;
    canManageStaff: boolean;
    // Scale features
    canMultiLocation: boolean;
    canConsolidatedReports: boolean;
    canAdvancedStockValuation: boolean;
    canGranularPermissions: boolean;
    canAuditTrail: boolean;
    canBulkCustomerFollowUp: boolean;
    canAdvancedDataExport: boolean;
    canPrioritySupport: boolean;
    // New Feature Entitlements
    canCreateQuotations: boolean;
    canUsePrinterSettings: boolean;
    canUploadProductImages: boolean;
    canScanPurchaseBills: boolean;
    canImportScannedPurchases: boolean;
  };
}

export const BILLING_INTERVALS: { key: BillingInterval; label: string; months: number }[] = [
  { key: 'MONTHLY', label: 'Monthly', months: 1 },
  { key: 'THREE_MONTHS', label: '3 Months', months: 3 },
  { key: 'SIX_MONTHS', label: '6 Months', months: 6 },
  { key: 'YEARLY', label: 'Yearly (12 Mo)', months: 12 },
];

/**
 * Calculates exact pricing, monthly equivalent, and savings compared to paying monthly
 */
function calculatePricing(monthlyBase: number, months: number, packagePrice: number): PlanPricing {
  const fullMonthlySum = monthlyBase * months;
  const savings = Math.max(0, fullMonthlySum - packagePrice);
  const savingsPercent = months > 1 ? Math.round((savings / fullMonthlySum) * 100) : 0;
  return {
    durationMonths: months,
    totalPrice: packagePrice,
    monthlyEquivalent: Math.round(packagePrice / months),
    savingsAmount: savings,
    savingsPercent,
  };
}

export const OFFICIAL_PLANS: Record<PlanKey, OfficialPlan> = {
  FREE_KHATA: {
    id: 'FREE_KHATA',
    prismaEnum: 'FREE_KHATA',
    name: 'Pakka Chittha Free Khata',
    tagline: 'Permanent 100% Free Udhaar Khata for Personal Lending & Borrowing',
    limits: {
      maxUsers: 1,
      maxLocations: 1,
      maxMonthlyInvoices: 0,
      isUnlimitedInvoices: false,
    },
    pricing: {
      MONTHLY: calculatePricing(0, 1, 0),
      THREE_MONTHS: calculatePricing(0, 3, 0),
      SIX_MONTHS: calculatePricing(0, 6, 0),
      YEARLY: calculatePricing(0, 12, 0),
    },
    features: [
      '100% Permanently Free personal udhaar ledger',
      'Unlimited contacts & people',
      'Unlimited "I Gave" and "I Received" transactions',
      'Partial and full repayment tracking',
      'Free manual WhatsApp reminder sharing',
      'Real-time collection & repayment dashboard',
      'Mobile-first responsive khata',
      'Zero credit card & zero payment required',
      'No trial expiry or forced conversion',
    ],
    entitlements: {
      canAccessFreeKhata: true,
      canCreateInvoices: false,
      canConfigureGst: false,
      canGeneratePdf: false,
      canManageCustomers: false,
      canTrackUdhaar: false,
      canRecordPayments: false,
      canManualWhatsAppShare: true,
      canManageInventoryBasic: false,
      canRecordExpenses: false,
      canViewBasicDashboard: false,
      canAdvancedCustomerLedger: false,
      canOpeningBalances: false,
      canManagePurchases: false,
      canManageSuppliers: false,
      canAdvancedInventory: false,
      canLowStockAlerts: false,
      canAdvancedReports: false,
      canCustomLogoInvoice: false,
      canCustomerStatements: false,
      canBulkExport: false,
      canManageStaff: false,
      canMultiLocation: false,
      canConsolidatedReports: false,
      canAdvancedStockValuation: false,
      canGranularPermissions: false,
      canAuditTrail: false,
      canBulkCustomerFollowUp: false,
      canAdvancedDataExport: false,
      canPrioritySupport: false,
      canCreateQuotations: true,
      canUsePrinterSettings: true,
      canUploadProductImages: false,
      canScanPurchaseBills: false,
      canImportScannedPurchases: false,
    },
  },

  STARTER: {
    id: 'STARTER',
    prismaEnum: 'STARTER',
    name: 'Pakka Chittha Starter',
    tagline: 'Ideal for single-counter retail shops & solo merchants',
    limits: {
      maxUsers: 1,
      maxLocations: 1,
      maxMonthlyInvoices: 999999,
      isUnlimitedInvoices: true,
    },
    pricing: {
      MONTHLY: calculatePricing(199, 1, 199),
      THREE_MONTHS: calculatePricing(199, 3, 499),
      SIX_MONTHS: calculatePricing(199, 6, 799),
      YEARLY: calculatePricing(199, 12, 1499),
    },
    features: [
      'Billing and invoice creation',
      'GST and non-GST invoice configuration',
      'PDF invoice generation',
      'Customer management',
      'Basic customer ledger and udhaar tracking',
      'Payment recording and receipts',
      'Manual WhatsApp bill sharing',
      'Product catalogue',
      'Basic stock tracking',
      'Basic expense recording',
      'Basic sales and collection dashboard',
      'Basic transaction history',
      'Standard invoice branding',
      '1 User, 1 Location',
      'Unlimited Invoices',
      'Free Udhaar Khata Included',
    ],
    entitlements: {
      canAccessFreeKhata: true,
      canCreateInvoices: true,
      canConfigureGst: true,
      canGeneratePdf: true,
      canManageCustomers: true,
      canTrackUdhaar: true,
      canRecordPayments: true,
      canManualWhatsAppShare: true,
      canManageInventoryBasic: true,
      canRecordExpenses: true,
      canViewBasicDashboard: true,
      // Growth/Scale features not in Starter
      canAdvancedCustomerLedger: false,
      canOpeningBalances: false,
      canManagePurchases: false,
      canManageSuppliers: false,
      canAdvancedInventory: false,
      canLowStockAlerts: false,
      canAdvancedReports: false,
      canCustomLogoInvoice: false,
      canCustomerStatements: false,
      canBulkExport: false,
      canManageStaff: false,
      canMultiLocation: false,
      canConsolidatedReports: false,
      canAdvancedStockValuation: false,
      canGranularPermissions: false,
      canAuditTrail: false,
      canBulkCustomerFollowUp: false,
      canAdvancedDataExport: false,
      canPrioritySupport: false,
      canCreateQuotations: true,
      canUsePrinterSettings: true,
      canUploadProductImages: false,
      canScanPurchaseBills: false,
      canImportScannedPurchases: false,
    },
  },

  GROWTH: {
    id: 'GROWTH',
    prismaEnum: 'GROWTH_PRO',
    name: 'Pakka Chittha Growth',
    tagline: 'Complete commercial billing, vendor management & team workflow',
    badge: 'Recommended',
    isPopular: true,
    limits: {
      maxUsers: 3,
      maxLocations: 1,
      maxMonthlyInvoices: 999999,
      isUnlimitedInvoices: true,
    },
    pricing: {
      MONTHLY: calculatePricing(499, 1, 499),
      THREE_MONTHS: calculatePricing(499, 3, 1299),
      SIX_MONTHS: calculatePricing(499, 6, 2499),
      YEARLY: calculatePricing(499, 12, 4499),
    },
    features: [
      'Everything in Starter',
      'Advanced customer ledger',
      'Opening balances and payment allocation',
      'Purchase invoices and supplier management',
      'Supplier balances and purchase history',
      'Advanced inventory management',
      'Low-stock alerts and stock movement history',
      'Advanced sales, collection and outstanding reports',
      'Custom business logo and invoice details',
      'Customer statements',
      'Bulk export where supported',
      'Basic staff roles and permissions',
      'Expanded search and filtering',
      'Up to 3 Users, 1 Location',
      'Unlimited Invoices',
      'Free Udhaar Khata Included',
    ],
    entitlements: {
      canAccessFreeKhata: true,
      canCreateInvoices: true,
      canConfigureGst: true,
      canGeneratePdf: true,
      canManageCustomers: true,
      canTrackUdhaar: true,
      canRecordPayments: true,
      canManualWhatsAppShare: true,
      canManageInventoryBasic: true,
      canRecordExpenses: true,
      canViewBasicDashboard: true,
      canAdvancedCustomerLedger: true,
      canOpeningBalances: true,
      canManagePurchases: true,
      canManageSuppliers: true,
      canAdvancedInventory: true,
      canLowStockAlerts: true,
      canAdvancedReports: true,
      canCustomLogoInvoice: true,
      canCustomerStatements: true,
      canBulkExport: true,
      canManageStaff: true,
      // Scale-only features
      canMultiLocation: false,
      canConsolidatedReports: false,
      canAdvancedStockValuation: false,
      canGranularPermissions: false,
      canAuditTrail: false,
      canBulkCustomerFollowUp: false,
      canAdvancedDataExport: false,
      canPrioritySupport: false,
      canCreateQuotations: true,
      canUsePrinterSettings: true,
      canUploadProductImages: false,
      canScanPurchaseBills: false,
      canImportScannedPurchases: false,
    },
  },

  SCALE: {
    id: 'SCALE',
    prismaEnum: 'ENTERPRISE',
    name: 'Pakka Chittha Scale',
    tagline: 'Multi-location operations, advanced valuation & enterprise controls',
    limits: {
      maxUsers: 10,
      maxLocations: 3,
      maxMonthlyInvoices: 999999,
      isUnlimitedInvoices: true,
    },
    pricing: {
      MONTHLY: calculatePricing(999, 1, 999),
      THREE_MONTHS: calculatePricing(999, 3, 2499),
      SIX_MONTHS: calculatePricing(999, 6, 4499),
      YEARLY: calculatePricing(999, 12, 8499),
    },
    features: [
      'Everything in Growth',
      'Multi-location management (Up to 3 Branches)',
      'Consolidated multi-location reports',
      'Advanced stock valuation',
      'Granular staff permissions',
      'Expanded audit trail',
      'Advanced inventory and business reports',
      'Bulk customer follow-up workflows',
      'Advanced data export',
      'Priority support information and policy',
      'Up to 10 Users, 3 Locations',
      'Unlimited Invoices',
      'Free Udhaar Khata Included',
    ],
    entitlements: {
      canAccessFreeKhata: true,
      canCreateInvoices: true,
      canConfigureGst: true,
      canGeneratePdf: true,
      canManageCustomers: true,
      canTrackUdhaar: true,
      canRecordPayments: true,
      canManualWhatsAppShare: true,
      canManageInventoryBasic: true,
      canRecordExpenses: true,
      canViewBasicDashboard: true,
      canAdvancedCustomerLedger: true,
      canOpeningBalances: true,
      canManagePurchases: true,
      canManageSuppliers: true,
      canAdvancedInventory: true,
      canLowStockAlerts: true,
      canAdvancedReports: true,
      canCustomLogoInvoice: true,
      canCustomerStatements: true,
      canBulkExport: true,
      canManageStaff: true,
      canMultiLocation: true,
      canConsolidatedReports: true,
      canAdvancedStockValuation: true,
      canGranularPermissions: true,
      canAuditTrail: true,
      canBulkCustomerFollowUp: true,
      canAdvancedDataExport: true,
      canPrioritySupport: true,
      canCreateQuotations: true,
      canUsePrinterSettings: true,
      canUploadProductImages: true,
      canScanPurchaseBills: true,
      canImportScannedPurchases: true,
    },
  },
};

/**
 * Normalizes any database plan representation to PlanKey
 */
export function normalizePlanKey(plan: string | null | undefined): PlanKey {
  if (!plan) return 'STARTER';
  const upper = plan.toUpperCase();
  if (upper === 'FREE_KHATA' || upper === 'KHATA') return 'FREE_KHATA';
  if (upper === 'SCALE' || upper === 'ENTERPRISE') return 'SCALE';
  if (upper === 'GROWTH' || upper === 'GROWTH_PRO') return 'GROWTH';
  return 'STARTER';
}

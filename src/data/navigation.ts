import { NavigationGroup, NavigationItem } from '@/types';

export type { NavigationItem };

/**
 * 1. Business Workspace Navigation:
 * Accessed by BUSINESS_OWNER and subordinate roles (BILLING_STAFF, ACCOUNTANT, INVENTORY_MANAGER).
 * All routes are scoped strictly to the authenticated user's business tenant workspace.
 */
export const BUSINESS_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Overview',
    href: '/',
    iconName: 'LayoutDashboard',
    description: 'Overview, key sales metrics, cash flow and alerts',
  },
  {
    id: 'invoices',
    name: 'Billing & Invoices',
    href: '/invoices',
    iconName: 'FileText',
    badge: 'GST',
    badgeColor: 'blue',
    description: 'Tax invoices, delivery challans, credit/debit notes',
  },
  {
    id: 'quotations',
    name: 'Quotations',
    href: '/quotations',
    iconName: 'FileSpreadsheet',
    badge: 'Estimates',
    badgeColor: 'emerald',
    description: 'Create price estimates, proposals, and convert to invoices',
  },
  {
    id: 'customers',
    name: 'Customers',
    href: '/customers',
    iconName: 'Users',
    description: 'Customer directory and account profiles',
  },
  {
    id: 'customer-ledger',
    name: 'Customer Ledger',
    href: '/customers?view=ledger',
    iconName: 'BookOpen',
    badge: 'Udhaar',
    badgeColor: 'amber',
    description: 'Customer credit ledger, payment reminders, statement',
  },
  {
    id: 'payments',
    name: 'Payments',
    href: '/invoices?view=payments',
    iconName: 'CreditCard',
    description: 'Received collections, payment vouchers and settlements',
  },
  {
    id: 'inventory',
    name: 'Products & Inventory',
    href: '/inventory',
    iconName: 'Package',
    description: 'Stock catalog, HSN/SAC codes, low-stock warnings',
  },
  {
    id: 'purchases',
    name: 'Purchases',
    href: '/purchases',
    iconName: 'Truck',
    description: 'Vendor bills, purchase orders, input tax credit',
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    href: '/suppliers',
    iconName: 'Store',
    description: 'Supplier directory and procurement accounts',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    href: '/expenses',
    iconName: 'Receipt',
    description: 'Operating costs, transport, utilities, petty cash',
  },
  {
    id: 'reports',
    name: 'Reports & Taxes',
    href: '/reports',
    iconName: 'BarChart3',
    badge: 'GSTR',
    badgeColor: 'emerald',
    description: 'Sales ledger, GST summary, profit & loss, balance sheet',
  },
  {
    id: 'settings',
    name: 'Business Settings',
    href: '/settings',
    iconName: 'Settings',
    description: 'Business name, logo, address, GSTIN and invoice branding',
  },
  {
    id: 'printer-settings',
    name: 'Printer Settings',
    href: '/settings/printer',
    iconName: 'Printer',
    badge: 'Thermal',
    badgeColor: 'emerald',
    description: 'Configure Bluetooth thermal printers, 58mm/80mm roll, and test print',
  },
  {
    id: 'subscription',
    name: 'Subscription',
    href: '/subscription',
    iconName: 'Crown',
    badge: 'Pro',
    badgeColor: 'amber',
    description: 'Client workspace subscription plan, renewal & limits',
  },
  {
    id: 'free-khata-link',
    name: 'Free Udhaar Khata',
    href: '/free-khata',
    iconName: 'BookOpen',
    badge: 'Free',
    badgeColor: 'emerald',
    description: 'Personal lending and borrowing ledger',
  },
  {
    id: 'ghar-kharcha-link',
    name: 'Ghar Kharcha',
    href: '/ghar-kharcha',
    iconName: 'Home',
    badge: '100% Free',
    badgeColor: 'emerald',
    description: 'Family household budget and expense tracker',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Automation',
    href: '/whatsapp',
    iconName: 'MessageSquare',
    badge: 'API',
    badgeColor: 'emerald',
    description: 'Automated invoice PDFs, payment reminder broadcasts',
  },
];

/**
 * PakkaChittha Ghar Kharcha (Household Mode) Navigation:
 * Dedicated navigation for users managing household finances, budgets, and family collaboration.
 */
export const HOUSEHOLD_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'household-dashboard',
    name: 'Ghar Dashboard',
    href: '/ghar-kharcha',
    iconName: 'LayoutDashboard',
    badge: 'Free',
    badgeColor: 'emerald',
    description: 'Household income, expenses, cash flow & budget utilization',
  },
  {
    id: 'household-transactions',
    name: 'Kharcha Register',
    href: '/ghar-kharcha/transactions',
    iconName: 'Receipt',
    description: 'Full transaction ledger, filters, search & expense entry',
  },
  {
    id: 'household-splits',
    name: 'Splits & Settlements',
    href: '/ghar-kharcha/splits',
    iconName: 'Scale',
    badge: 'Family',
    badgeColor: 'blue',
    description: 'Expense sharing, equal & custom splits, member balances & repayments',
  },
  {
    id: 'household-reports',
    name: 'Reports & Analytics',
    href: '/ghar-kharcha/reports',
    iconName: 'BarChart3',
    description: 'Category breakdowns, trends, utility bills, CSV, Excel & PDF exports',
  },
  {
    id: 'household-budget',
    name: 'Monthly Budget',
    href: '/ghar-kharcha/budget',
    iconName: 'Landmark',
    description: 'Monthly spending budget and category tracking',
  },
  {
    id: 'household-categories',
    name: 'Categories',
    href: '/ghar-kharcha/categories',
    iconName: 'SlidersHorizontal',
    description: 'Household income, expense & bills categories',
  },
  {
    id: 'household-members',
    name: 'Family Members',
    href: '/ghar-kharcha/members',
    iconName: 'Users',
    badge: 'Members',
    badgeColor: 'blue',
    description: 'Family collaboration, invitations & permissions',
  },
  {
    id: 'business-workspace-switch',
    name: 'Switch to Business Mode',
    href: '/',
    iconName: 'Building2',
    description: 'Open commercial business billing & accounting workspace',
  },
];

/**
 * Free Khata Navigation:
 * Dedicated streamlined navigation for users on the permanent Free Khata plan.
 */
export const FREE_KHATA_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'free-khata-dashboard',
    name: 'Khata Dashboard',
    href: '/free-khata',
    iconName: 'LayoutDashboard',
    badge: 'Free',
    badgeColor: 'emerald',
    description: 'Personal lending & borrowing overview, collections & repayments',
  },
  {
    id: 'free-khata-contacts',
    name: 'People & Contacts',
    href: '/free-khata/contacts',
    iconName: 'Users',
    description: 'All people in your personal khata with net balances',
  },
  {
    id: 'free-khata-gave',
    name: 'I Gave (Maine Diye)',
    href: '/free-khata?filter=GAVE',
    iconName: 'CreditCard',
    badge: 'Collect',
    badgeColor: 'emerald',
    description: 'Money you lent out that you have to collect',
  },
  {
    id: 'free-khata-received',
    name: 'I Received (Maine Liye)',
    href: '/free-khata?filter=RECEIVED',
    iconName: 'Receipt',
    badge: 'Repay',
    badgeColor: 'amber',
    description: 'Money you borrowed that you have to repay',
  },
  {
    id: 'free-khata-reminders',
    name: 'WhatsApp Reminders',
    href: '/free-khata?view=reminders',
    iconName: 'MessageSquare',
    badge: 'Free',
    badgeColor: 'emerald',
    description: 'Share friendly payment reminders via WhatsApp',
  },
];

/**
 * 2. Platform Administration Navigation:
 * Exclusively for SUPER_ADMIN (Platform Owner / Developer).
 * Global cross-tenant management, subscription plans, limits, and system controls.
 */
export const PLATFORM_ADMIN_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'platform-admin-overview',
    name: 'Platform Overview',
    href: '/platform-admin',
    iconName: 'LayoutGrid',
    badge: 'Admin',
    badgeColor: 'violet',
    description: 'Global SaaS revenue, active businesses, and platform health',
  },
  {
    id: 'platform-admin-users',
    name: 'Platform Users',
    href: '/platform-admin/users',
    iconName: 'Users',
    badge: 'Accounts',
    badgeColor: 'blue',
    description: 'Manage registered users, suspension, roles and security',
  },
  {
    id: 'platform-admin-businesses',
    name: 'Business Accounts',
    href: '/platform-admin/businesses',
    iconName: 'Building2',
    badge: 'Tenants',
    badgeColor: 'blue',
    description: 'Manage client accounts, activate, suspend, or renew subscriptions',
  },
  {
    id: 'platform-admin-free-khata',
    name: 'Free Khata Oversight',
    href: '/platform-admin/free-khata',
    iconName: 'BookOpen',
    badge: 'Free',
    badgeColor: 'emerald',
    description: 'Monitor individual free khata usage, records, and activity',
  },
  {
    id: 'platform-admin-subscriptions',
    name: 'Subscriptions',
    href: '/platform-admin/subscriptions',
    iconName: 'CreditCard',
    badge: 'Plans',
    badgeColor: 'amber',
    description: 'Commercial client subscriptions, upgrades, and renewals',
  },
  {
    id: 'platform-admin-payments',
    name: 'Payments & Gateway',
    href: '/platform-admin/payments',
    iconName: 'Receipt',
    badge: 'Billing',
    badgeColor: 'emerald',
    description: 'Razorpay transactions, settlements, and payment logs',
  },
  {
    id: 'platform-admin-reports',
    name: 'Revenue & Analytics',
    href: '/platform-admin/reports',
    iconName: 'BarChart3',
    badge: 'SaaS',
    badgeColor: 'blue',
    description: 'Platform MRR, churn rate, plan distribution and metrics',
  },
  {
    id: 'platform-admin-plans',
    name: 'Plans & Limits',
    href: '/platform-admin/plans',
    iconName: 'SlidersHorizontal',
    badge: 'Config',
    badgeColor: 'amber',
    description: 'Configure subscription tiers, quota limits, and feature toggles',
  },
  {
    id: 'platform-admin-audit-logs',
    name: 'Audit Logs',
    href: '/platform-admin/audit-logs',
    iconName: 'ShieldCheck',
    badge: 'Security',
    badgeColor: 'violet',
    description: 'Track administrative actions, changes, and security events',
  },
  {
    id: 'platform-admin-settings',
    name: 'Platform Settings',
    href: '/platform-admin/settings',
    iconName: 'ShieldAlert',
    description: 'Global security, gateway credentials, tax APIs and platform config',
  },
];

/**
 * Navigation Groups for structured sidebar presentation
 */
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: 'business_workspace',
    title: 'Business Workspace',
    scope: 'BUSINESS_WORKSPACE',
    description: 'Client workspace operations for Business Owners & delegated staff',
    badge: 'Tenant Scope',
    items: BUSINESS_NAVIGATION_ITEMS,
  },
  {
    id: 'platform_administration',
    title: 'Platform Admin Panel',
    scope: 'PLATFORM_ADMIN',
    description: 'Super Admin platform controls for SaaS management',
    badge: 'Super Admin',
    items: PLATFORM_ADMIN_NAVIGATION_ITEMS,
  },
];

/**
 * Backward compatibility alias
 */
export const NAVIGATION_ITEMS: NavigationItem[] = BUSINESS_NAVIGATION_ITEMS;


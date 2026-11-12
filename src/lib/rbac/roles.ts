import type { BusinessRole } from '@prisma/client';

export type ErpRole = 'OWNER' | 'ACCOUNTANT' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export const ERP_ROLES: readonly ErpRole[] = [
  'OWNER',
  'ACCOUNTANT',
  'MANAGER',
  'OPERATOR',
  'VIEWER',
] as const;

export const ERP_ROLE_METADATA: Record<
  ErpRole,
  {
    label: string;
    labelHi: string;
    description: string;
    legacyEnum: BusinessRole;
  }
> = {
  OWNER: {
    label: 'Owner',
    labelHi: 'मालिक (Owner)',
    description: 'Full control over business, billing, staff, accountant permissions, approvals, and subscription.',
    legacyEnum: 'BUSINESS_OWNER',
  },
  ACCOUNTANT: {
    label: 'Accountant (CA)',
    labelHi: 'अकाउंटेंट / सीए',
    description: 'Dedicated accounting, GST compliance, ledger, banking & audit workspace across permitted businesses.',
    legacyEnum: 'ACCOUNTANT',
  },
  MANAGER: {
    label: 'Manager',
    labelHi: 'मैनेजर',
    description: 'Manages daily billing, purchases, stock, customers, and operational reports.',
    legacyEnum: 'MANAGER',
  },
  OPERATOR: {
    label: 'Operator / Staff',
    labelHi: 'ऑपरेटर / स्टाफ',
    description: 'Creates bills, records payments, updates stock, and manages customers.',
    legacyEnum: 'OPERATOR',
  },
  VIEWER: {
    label: 'Viewer (Read-Only)',
    labelHi: 'दर्शक (केवल देखने के लिए)',
    description: 'Read-only access to invoices, inventory, ledgers, and reports without modification rights.',
    legacyEnum: 'VIEWER',
  },
};

export const PERMISSIONS = {
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_VOUCHER_WRITE: 'accounting.voucher.write',
  ACCOUNTING_LEDGER_MANAGE: 'accounting.ledger.manage',
  ACCOUNTING_PERIOD_CLOSE: 'accounting.period.close',

  GST_VIEW: 'gst.view',
  GST_RECONCILE: 'gst.reconcile',
  GST_FILE_PREPARE: 'gst.file.prepare',
  GST_FILE_SUBMIT: 'gst.file.submit',

  BANKING_VIEW: 'banking.view',
  BANKING_RECONCILE: 'banking.reconcile',

  BILLING_VIEW: 'billing.view',
  BILLING_WRITE: 'billing.write',
  BILLING_VOID: 'billing.void',

  PURCHASE_VIEW: 'purchase.view',
  PURCHASE_WRITE: 'purchase.write',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_WRITE: 'inventory.write',
  INVENTORY_VALUATION: 'inventory.valuation',

  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_WRITE: 'customers.write',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  AUDIT_VIEW: 'audit.view',

  APPROVAL_REQUEST: 'approval.request',
  APPROVAL_DECIDE: 'approval.decide',

  BRANCH_VIEW: 'branch.view',
  BRANCH_MANAGE: 'branch.manage',

  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  ACCOUNTANT_MANAGE: 'accountant.manage',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',

  SUBSCRIPTION_MANAGE: 'subscription.manage',
  OWNERSHIP_TRANSFER: 'ownership.transfer',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(PERMISSIONS);

/**
 * Owner-exclusive governance privileges that can NEVER be delegated to Accountants or Staff.
 */
export const OWNER_ONLY_PERMISSIONS: readonly PermissionCode[] = [
  PERMISSIONS.SUBSCRIPTION_MANAGE,
  PERMISSIONS.OWNERSHIP_TRANSFER,
  PERMISSIONS.ACCOUNTANT_MANAGE,
  PERMISSIONS.APPROVAL_DECIDE,
];

/**
 * Granular permission options that an Owner can configure for an invited Accountant.
 */
export const ACCOUNTANT_ASSIGNABLE_PERMISSIONS: ReadonlyArray<{
  code: PermissionCode;
  module: string;
  label: string;
  description: string;
}> = [
  {
    code: PERMISSIONS.ACCOUNTING_VIEW,
    module: 'Accounting',
    label: 'View Financial Statements & Ledgers',
    description: 'Access P&L, Balance Sheet, Trial Balance, and Chart of Accounts.',
  },
  {
    code: PERMISSIONS.ACCOUNTING_VOUCHER_WRITE,
    module: 'Accounting',
    label: 'Create & Edit Vouchers / Journals',
    description: 'Post journal entries, contra, receipt, payment, and adjustment vouchers.',
  },
  {
    code: PERMISSIONS.ACCOUNTING_LEDGER_MANAGE,
    module: 'Accounting',
    label: 'Manage Chart of Accounts & Groups',
    description: 'Configure accounting groups and ledgers within authorized scope.',
  },
  {
    code: PERMISSIONS.ACCOUNTING_PERIOD_CLOSE,
    module: 'Accounting',
    label: 'Prepare Period Closing & Lock Requests',
    description: 'Verify balances and submit year-end or month-lock requests for Owner approval.',
  },
  {
    code: PERMISSIONS.GST_VIEW,
    module: 'GST Compliance',
    label: 'View GST Summaries & Ledgers',
    description: 'Inspect Output Tax, ITC, GSTR-1, GSTR-3B, and HSN summaries.',
  },
  {
    code: PERMISSIONS.GST_RECONCILE,
    module: 'GST Compliance',
    label: 'Run GSTR-2A / 2B Reconciliation',
    description: 'Import and match supplier purchase invoices against GSTR-2B.',
  },
  {
    code: PERMISSIONS.GST_FILE_PREPARE,
    module: 'GST Compliance',
    label: 'Prepare GST Returns & JSON Exports',
    description: 'Generate draft GST returns and compliance validation packages.',
  },
  {
    code: PERMISSIONS.BANKING_VIEW,
    module: 'Banking',
    label: 'View Cash & Bank Ledgers',
    description: 'View cash book, bank accounts, and payment collections.',
  },
  {
    code: PERMISSIONS.BANKING_RECONCILE,
    module: 'Banking',
    label: 'Perform Bank Reconciliation',
    description: 'Reconcile bank statements against books.',
  },
  {
    code: PERMISSIONS.BILLING_VIEW,
    module: 'Operations',
    label: 'View Sales Invoices & Quotations',
    description: 'Read-only access to customer invoices, credit notes, and quotations.',
  },
  {
    code: PERMISSIONS.PURCHASE_VIEW,
    module: 'Operations',
    label: 'View Purchase Bills & Suppliers',
    description: 'Inspect supplier bills and expenses for accounting verification.',
  },
  {
    code: PERMISSIONS.INVENTORY_VIEW,
    module: 'Inventory',
    label: 'View Stock & Valuation',
    description: 'Inspect stock summaries and inventory closing valuation.',
  },
  {
    code: PERMISSIONS.INVENTORY_VALUATION,
    module: 'Inventory',
    label: 'Audit & Reconcile Stock Valuation',
    description: 'Review FIFO/Weighted Avg stock valuation for closing entries.',
  },
  {
    code: PERMISSIONS.CUSTOMERS_VIEW,
    module: 'Operations',
    label: 'View Parties & Ledgers',
    description: 'View debtor/creditor balances and ageing.',
  },
  {
    code: PERMISSIONS.REPORTS_VIEW,
    module: 'Reports',
    label: 'View Statutory & MIS Reports',
    description: 'Access GST, TDS, Financial, and Register reports.',
  },
  {
    code: PERMISSIONS.REPORTS_EXPORT,
    module: 'Reports',
    label: 'Export CA Audit Packs (Excel/PDF/JSON)',
    description: 'Download structured compliance and financial exports.',
  },
  {
    code: PERMISSIONS.AUDIT_VIEW,
    module: 'Governance',
    label: 'View Immutable Audit Trail',
    description: 'Review system activity logs and change history.',
  },
];

export const DEFAULT_ACCOUNTANT_PERMISSIONS: readonly PermissionCode[] =
  ACCOUNTANT_ASSIGNABLE_PERMISSIONS.map((p) => p.code);

export const ROLE_DEFAULT_PERMISSIONS: Record<ErpRole, readonly PermissionCode[]> = {
  OWNER: ALL_PERMISSIONS,
  ACCOUNTANT: [
    ...DEFAULT_ACCOUNTANT_PERMISSIONS,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.APPROVAL_REQUEST,
    PERMISSIONS.SETTINGS_VIEW,
  ],
  MANAGER: [
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.GST_VIEW,
    PERMISSIONS.BANKING_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_WRITE,
    PERMISSIONS.BILLING_VOID,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_WRITE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.APPROVAL_REQUEST,
  ],
  OPERATOR: [
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_WRITE,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_WRITE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  VIEWER: [
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.GST_VIEW,
    PERMISSIONS.BANKING_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
  ],
};

/**
 * Maps legacy BusinessRole enum values and new ERP roles into a unified 5-role taxonomy.
 */
export function normalizeErpRole(role: BusinessRole | string | null | undefined): ErpRole {
  switch (role) {
    case 'OWNER':
    case 'BUSINESS_OWNER':
      return 'OWNER';
    case 'ACCOUNTANT':
      return 'ACCOUNTANT';
    case 'MANAGER':
      return 'MANAGER';
    case 'OPERATOR':
    case 'BILLING_STAFF':
    case 'INVENTORY_MANAGER':
      return 'OPERATOR';
    case 'VIEWER':
      return 'VIEWER';
    default:
      return 'VIEWER';
  }
}

/**
 * Converts requested ERP role string to Prisma BusinessRole enum for safe persistence.
 * Uses new enum values cleanly when present while preserving legacy BUSINESS_OWNER default for Owner.
 */
export function toPrismaBusinessRole(role: string): BusinessRole {
  const normalized = normalizeErpRole(role);
  switch (normalized) {
    case 'OWNER':
      return 'BUSINESS_OWNER';
    case 'ACCOUNTANT':
      return 'ACCOUNTANT';
    case 'MANAGER':
      return 'MANAGER' as BusinessRole;
    case 'OPERATOR':
      return 'OPERATOR' as BusinessRole;
    case 'VIEWER':
      return 'VIEWER' as BusinessRole;
  }
}

export function isOwnerRole(role: BusinessRole | string | null | undefined): boolean {
  return normalizeErpRole(role) === 'OWNER';
}

export function isAccountantRole(role: BusinessRole | string | null | undefined): boolean {
  return normalizeErpRole(role) === 'ACCOUNTANT';
}

export function isReadOnlyRole(role: BusinessRole | string | null | undefined): boolean {
  return normalizeErpRole(role) === 'VIEWER';
}

export interface AccountantPermissionContext {
  permissions?: string[] | null;
  canFileGst?: boolean;
}

/**
 * Resolves effective permissions for a user in a business, strictly stripping
 * Owner-only governance capabilities from non-Owner roles.
 */
export function resolveEffectivePermissions(
  role: BusinessRole | string | null | undefined,
  membershipPermissions?: string[] | null,
  accountantAccess?: AccountantPermissionContext | null
): PermissionCode[] {
  const erpRole = normalizeErpRole(role);

  if (erpRole === 'OWNER') {
    return [...ALL_PERMISSIONS];
  }

  const ownerOnlySet = new Set<string>(OWNER_ONLY_PERMISSIONS);
  const validSet = new Set<string>(ALL_PERMISSIONS);

  let base: string[];
  if (erpRole === 'ACCOUNTANT' && accountantAccess?.permissions && accountantAccess.permissions.length > 0) {
    base = [
      ...accountantAccess.permissions,
      PERMISSIONS.BRANCH_VIEW,
      PERMISSIONS.APPROVAL_REQUEST,
      PERMISSIONS.SETTINGS_VIEW,
    ];
  } else if (membershipPermissions && membershipPermissions.length > 0) {
    base = [...membershipPermissions];
  } else {
    base = [...ROLE_DEFAULT_PERMISSIONS[erpRole]];
  }

  if (erpRole === 'ACCOUNTANT' && accountantAccess?.canFileGst) {
    base.push(PERMISSIONS.GST_FILE_SUBMIT);
  }

  const deduped = new Set<PermissionCode>();
  for (const perm of base) {
    if (validSet.has(perm) && !ownerOnlySet.has(perm)) {
      deduped.add(perm as PermissionCode);
    }
  }
  return Array.from(deduped);
}

export function hasPermission(
  grantedPermissions: readonly string[] | null | undefined,
  required: PermissionCode
): boolean {
  if (!grantedPermissions || grantedPermissions.length === 0) return false;
  return grantedPermissions.includes(required);
}

export function hasAnyPermission(
  grantedPermissions: readonly string[] | null | undefined,
  required: readonly PermissionCode[]
): boolean {
  if (!grantedPermissions || grantedPermissions.length === 0) return false;
  return required.some((perm) => grantedPermissions.includes(perm));
}


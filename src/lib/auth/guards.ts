import {
  getCurrentSession,
  CurrentAuthSession,
  ActiveBusinessWorkspace,
  resolveBusinessWorkspaceForUser,
  buildActiveWorkspacePayload,
} from './session';
import { AccessScopeType, BusinessRole, PlatformRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  ErpRole,
  PermissionCode,
  hasPermission,
  hasAnyPermission,
  normalizeErpRole,
} from '@/lib/rbac/roles';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class TenantIsolationError extends Error {
  statusCode: number;
  constructor(message: string = 'Access Denied: Tenant isolation violation') {
    super(message);
    this.name = 'TenantIsolationError';
    this.statusCode = 403;
  }
}

/**
 * Requires that the request comes from an authenticated user.
 */
export async function requireAuth(): Promise<CurrentAuthSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError('Authentication required to access this resource', 401);
  }
  return session;
}

/**
 * Requires that the authenticated user holds SUPER_ADMIN platform privileges.
 */
export async function requireSuperAdmin(): Promise<CurrentAuthSession> {
  const session = await requireAuth();
  if (session.user.platformRole !== PlatformRole.SUPER_ADMIN) {
    throw new AuthError('Platform administrator privileges required', 403);
  }
  return session;
}

export const NON_VIEWER_ROLES: Array<BusinessRole | ErpRole | string> = [
  'BUSINESS_OWNER',
  'OWNER',
  'MANAGER',
  'OPERATOR',
  'BILLING_STAFF',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
];

export function matchesAllowedRoles(
  userRole: BusinessRole | string,
  allowedRoles: Array<BusinessRole | ErpRole | string>
): boolean {
  const normalizedUserRole = normalizeErpRole(userRole);
  return allowedRoles.some(
    (allowed) => allowed === userRole || normalizeErpRole(allowed) === normalizedUserRole
  );
}

/**
 * Server-side tenant isolation guard.
 * Strictly verifies on the server that the authenticated user is an active member
 * of the requested business tenant and checks allowedRoles against THAT target business.
 */
export async function requireTenantAccess(
  requestedBusinessId?: string,
  allowedRoles?: Array<BusinessRole | ErpRole | string>
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const session = await requireAuth();
  const isSuperAdmin = session.user.platformRole === PlatformRole.SUPER_ADMIN;

  let targetBusiness: ActiveBusinessWorkspace | null = session.activeBusiness;

  if (requestedBusinessId && requestedBusinessId !== session.activeBusiness?.id) {
    const resolved = await resolveBusinessWorkspaceForUser(
      session.user.id,
      requestedBusinessId
    );

    if (resolved) {
      targetBusiness = resolved;
    } else if (isSuperAdmin) {
      const biz = await prisma.business.findUnique({
        where: { id: requestedBusinessId },
        include: {
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
          branches: {
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
          financialYears: {
            where: { isActive: true },
            orderBy: { startDate: 'desc' },
          },
        },
      });
      if (!biz) {
        throw new TenantIsolationError('Requested business workspace was not found.');
      }
      targetBusiness = buildActiveWorkspacePayload({
        business: biz,
        membership: { role: BusinessRole.BUSINESS_OWNER },
      });
    } else {
      throw new TenantIsolationError(
        'Cross-tenant access prohibited. You do not hold active access to this business workspace.'
      );
    }
  }

  if (!targetBusiness) {
    throw new TenantIsolationError('No active business workspace found for user');
  }

  // Role check strictly evaluated against targetBusiness.role
  if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
    if (!matchesAllowedRoles(targetBusiness.role, allowedRoles)) {
      throw new AuthError(
        `Insufficient role privileges. Required: ${allowedRoles.join(', ')}`,
        403
      );
    }
  }

  return {
    session,
    business: targetBusiness,
    userRole: targetBusiness.role,
  };
}

/**
 * Server-side package entitlement guard.
 * Strictly verifies on the server that the active business has the required feature
 * enabled in its subscription plan. Blocks lower-tier plans from unauthorized APIs.
 */
export async function requireEntitlement(
  feature: keyof import('@/lib/subscription/plans').OfficialPlan['entitlements'],
  requestedBusinessId?: string,
  allowedRoles?: Array<BusinessRole | ErpRole | string>
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
  entitlements: import('@/lib/subscription/entitlements').BusinessEntitlementsResult;
}> {
  const result = await requireTenantAccess(requestedBusinessId, allowedRoles);
  const { getBusinessEntitlements, checkFeatureEntitlement } = await import('@/lib/subscription/entitlements');

  const entitlements = await getBusinessEntitlements(result.business.id);

  // Platform Super Admins have universal platform access
  if (result.session.user.platformRole === PlatformRole.SUPER_ADMIN) {
    return { ...result, entitlements };
  }

  const allowed = Boolean(entitlements.entitlements[feature as keyof typeof entitlements.entitlements]);

  if (!allowed) {
    const check = await checkFeatureEntitlement(
      result.business.id,
      feature as Parameters<typeof checkFeatureEntitlement>[1]
    );
    throw new AuthError(
      check.message ||
        `Feature not available. Your current ${entitlements.planName} plan does not include '${String(feature)}'.`,
      403
    );
  }

  return { ...result, entitlements };
}

/**
 * Server-side commercial subscription guard.
 * Blocks Free Khata users from accessing paid commercial billing, inventory,
 * purchases, and business accounting APIs.
 */
export async function requireCommercialAccess(
  requestedBusinessId?: string,
  allowedRoles?: Array<BusinessRole | ErpRole | string>
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireEntitlement('canCreateInvoices', requestedBusinessId, allowedRoles);
  return {
    session: result.session,
    business: result.business,
    userRole: result.userRole,
  };
}

/**
 * Server-side Growth plan guard.
 * Blocks Free Khata and Starter users from Growth/Scale features (Purchases, Suppliers, Staff, Reports).
 */
export async function requireGrowthAccess(
  requestedBusinessId?: string,
  allowedRoles?: Array<BusinessRole | ErpRole | string>
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireEntitlement('canManagePurchases', requestedBusinessId, allowedRoles);
  return {
    session: result.session,
    business: result.business,
    userRole: result.userRole,
  };
}

/**
 * Server-side Scale plan guard.
 * Blocks Free Khata, Starter, and Growth users from Scale-only features (Multi-location, advanced valuation).
 */
export async function requireScaleAccess(
  requestedBusinessId?: string,
  allowedRoles?: Array<BusinessRole | ErpRole | string>
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireEntitlement('canMultiLocation', requestedBusinessId, allowedRoles);
  return {
    session: result.session,
    business: result.business,
    userRole: result.userRole,
  };
}

/**
 * Verifies a granular RBAC permission against the resolved user permissions in a tenant.
 */
export async function requirePermission(
  requiredPermission: PermissionCode,
  requestedBusinessId?: string
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireTenantAccess(requestedBusinessId);
  const isSuperAdmin = result.session.user.platformRole === PlatformRole.SUPER_ADMIN;

  if (!isSuperAdmin && !hasPermission(result.business.permissions, requiredPermission)) {
    throw new AuthError(
      `Permission denied: '${requiredPermission}' is required for this operation.`,
      403
    );
  }
  return result;
}

/**
 * Verifies at least one of the specified RBAC permissions is granted.
 */
export async function requireAnyPermission(
  requiredPermissions: readonly PermissionCode[],
  requestedBusinessId?: string
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
}> {
  const result = await requireTenantAccess(requestedBusinessId);
  const isSuperAdmin = result.session.user.platformRole === PlatformRole.SUPER_ADMIN;

  if (!isSuperAdmin && !hasAnyPermission(result.business.permissions, requiredPermissions)) {
    throw new AuthError(
      `Permission denied: requires one of [${requiredPermissions.join(', ')}].`,
      403
    );
  }
  return result;
}

/**
 * Strictly requires Business Owner (OWNER / BUSINESS_OWNER) role.
 */
export async function requireOwnerRole(requestedBusinessId?: string) {
  return requireTenantAccess(requestedBusinessId, ['BUSINESS_OWNER', 'OWNER']);
}

/**
 * Scale-only ERP Workspace guard: verifies Scale plan entitlement (`canAccountantErp`)
 * AND optional granular RBAC permission on the target business.
 * Strictly returns 403 for FREE_KHATA, STARTER, and GROWTH plans.
 */
export async function requireScaleErpAccess(
  requestedBusinessId?: string,
  requiredPermission?: PermissionCode,
  allowedRoles?: Array<BusinessRole | ErpRole | string>
): Promise<{
  session: CurrentAuthSession;
  business: ActiveBusinessWorkspace;
  userRole: BusinessRole;
  entitlements: import('@/lib/subscription/entitlements').BusinessEntitlementsResult;
}> {
  const result = await requireEntitlement('canAccountantErp', requestedBusinessId, allowedRoles);
  const isSuperAdmin = result.session.user.platformRole === PlatformRole.SUPER_ADMIN;

  if (
    requiredPermission &&
    !isSuperAdmin &&
    !hasPermission(result.business.permissions, requiredPermission)
  ) {
    throw new AuthError(
      `Permission denied: '${requiredPermission}' is required for this ERP action.`,
      403
    );
  }

  return result;
}

/**
 * Enforces Owner-configured Branch and Financial Year scopes for Accountants.
 */
export function requireBranchAndFyScope(
  business: ActiveBusinessWorkspace,
  branchId?: string | null,
  fyCode?: string | null
): void {
  if (business.erpRole !== 'ACCOUNTANT' || !business.accountantAccess) {
    return;
  }

  const acc = business.accountantAccess;
  if (
    branchId &&
    branchId !== 'ALL' &&
    acc.branchScope === AccessScopeType.SELECTED &&
    !acc.branchIds.includes(branchId)
  ) {
    throw new AuthError(
      'Access denied: you are not authorized for the selected branch.',
      403
    );
  }

  if (
    fyCode &&
    fyCode !== 'ALL' &&
    acc.fyScope === AccessScopeType.SELECTED &&
    !acc.financialYears.includes(fyCode)
  ) {
    throw new AuthError(
      `Access denied: you are not authorized for financial year ${fyCode}.`,
      403
    );
  }
}


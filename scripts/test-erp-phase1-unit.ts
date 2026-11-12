import assert from 'node:assert/strict';
import {
  ALL_PERMISSIONS,
  DEFAULT_ACCOUNTANT_PERMISSIONS,
  ERP_ROLES,
  OWNER_ONLY_PERMISSIONS,
  PERMISSIONS,
  isAccountantRole,
  isOwnerRole,
  isReadOnlyRole,
  normalizeErpRole,
  resolveEffectivePermissions,
  toPrismaBusinessRole,
} from '../src/lib/rbac/roles';
import {
  buildIndianFyWindow,
  computeUpcomingStatutoryDeadlines,
  getIndianFyStartYear,
  parseIndianFyCode,
} from '../src/lib/rbac/fiscalYear';
import {
  hashInviteToken,
  sanitizeAccountantPermissions,
} from '../src/lib/rbac/accountantAccessService';
import {
  NON_VIEWER_ROLES,
  matchesAllowedRoles,
} from '../src/lib/auth/guards';
import { OFFICIAL_PLANS } from '../src/lib/subscription/plans';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS: ${name}`);
}

console.log('=== Pakka Chittha ERP Phase 1 Unit Tests ===');

runTest('normalizeErpRole maps all 5 ERP roles + 4 legacy BusinessRole values + unknown fallback', () => {
  assert.deepEqual([...ERP_ROLES], ['OWNER', 'ACCOUNTANT', 'MANAGER', 'OPERATOR', 'VIEWER']);

  assert.equal(normalizeErpRole('OWNER'), 'OWNER');
  assert.equal(normalizeErpRole('BUSINESS_OWNER'), 'OWNER');
  assert.equal(normalizeErpRole('ACCOUNTANT'), 'ACCOUNTANT');
  assert.equal(normalizeErpRole('MANAGER'), 'MANAGER');
  assert.equal(normalizeErpRole('OPERATOR'), 'OPERATOR');
  assert.equal(normalizeErpRole('BILLING_STAFF'), 'OPERATOR');
  assert.equal(normalizeErpRole('INVENTORY_MANAGER'), 'OPERATOR');
  assert.equal(normalizeErpRole('VIEWER'), 'VIEWER');

  // Unknown/null values fail safely to VIEWER
  assert.equal(normalizeErpRole(null), 'VIEWER');
  assert.equal(normalizeErpRole(undefined), 'VIEWER');
  assert.equal(normalizeErpRole('UNRECOGNIZED_ROLE'), 'VIEWER');

  assert.equal(toPrismaBusinessRole('OWNER'), 'BUSINESS_OWNER');
  assert.equal(toPrismaBusinessRole('ACCOUNTANT'), 'ACCOUNTANT');
  assert.equal(isOwnerRole('BUSINESS_OWNER'), true);
  assert.equal(isOwnerRole('ACCOUNTANT'), false);
  assert.equal(isAccountantRole('ACCOUNTANT'), true);
  assert.equal(isReadOnlyRole('VIEWER'), true);
  assert.equal(isReadOnlyRole('OPERATOR'), false);
});

runTest('resolveEffectivePermissions & sanitizeAccountantPermissions strip Owner-only permissions from non-Owners', () => {
  const injectedOwnerPerms = [
    ...OWNER_ONLY_PERMISSIONS,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.GST_VIEW,
  ];

  // Even if injected into membershipPermissions or accountantAccess, non-Owners never get Owner governance perms
  for (const nonOwnerRole of ['ACCOUNTANT', 'MANAGER', 'OPERATOR', 'VIEWER', 'BILLING_STAFF'] as const) {
    const resolved = resolveEffectivePermissions(nonOwnerRole, injectedOwnerPerms, {
      permissions: injectedOwnerPerms,
      canFileGst: true,
    });

    for (const ownerPerm of OWNER_ONLY_PERMISSIONS) {
      assert.equal(
        resolved.includes(ownerPerm),
        false,
        `${nonOwnerRole} must NEVER receive ${ownerPerm}`
      );
    }
    assert.equal(resolved.includes(PERMISSIONS.ACCOUNTING_VIEW), true);
  }

  // Accountant with canFileGst: true gets GST_FILE_SUBMIT but still lacks APPROVAL_DECIDE & SUBSCRIPTION_MANAGE
  const caWithGst = resolveEffectivePermissions('ACCOUNTANT', null, {
    permissions: [PERMISSIONS.GST_VIEW],
    canFileGst: true,
  });
  assert.equal(caWithGst.includes(PERMISSIONS.GST_FILE_SUBMIT), true);
  assert.equal(caWithGst.includes(PERMISSIONS.APPROVAL_DECIDE), false);
  assert.equal(caWithGst.includes(PERMISSIONS.SUBSCRIPTION_MANAGE), false);

  // sanitizeAccountantPermissions strips Owner-only & unknown codes cleanly
  const sanitized = sanitizeAccountantPermissions([
    ...OWNER_ONLY_PERMISSIONS,
    'non.existent.perm',
    PERMISSIONS.REPORTS_VIEW,
  ]);
  assert.deepEqual(sanitized, [PERMISSIONS.REPORTS_VIEW]);

  // Empty permissions fall back to DEFAULT_ACCOUNTANT_PERMISSIONS
  const defaulted = sanitizeAccountantPermissions([]);
  assert.equal(defaulted.length, DEFAULT_ACCOUNTANT_PERMISSIONS.length);

  // OWNER keeps every permission
  const ownerPerms = resolveEffectivePermissions('BUSINESS_OWNER');
  assert.equal(ownerPerms.length, ALL_PERMISSIONS.length);
  for (const ownerPerm of OWNER_ONLY_PERMISSIONS) {
    assert.equal(ownerPerms.includes(ownerPerm), true);
  }
});

runTest('matchesAllowedRoles unifies legacy/ERP aliases and blocks unauthorized roles', () => {
  assert.equal(matchesAllowedRoles('BUSINESS_OWNER', ['OWNER']), true);
  assert.equal(matchesAllowedRoles('OWNER', ['BUSINESS_OWNER']), true);
  assert.equal(matchesAllowedRoles('BILLING_STAFF', ['OPERATOR']), true);
  assert.equal(matchesAllowedRoles('INVENTORY_MANAGER', ['OPERATOR']), true);

  assert.equal(matchesAllowedRoles('ACCOUNTANT', ['BUSINESS_OWNER', 'OWNER']), false);
  assert.equal(matchesAllowedRoles('MANAGER', ['BUSINESS_OWNER', 'OWNER']), false);
  assert.equal(matchesAllowedRoles('VIEWER', ['BUSINESS_OWNER', 'OWNER']), false);

  assert.equal(matchesAllowedRoles('VIEWER', NON_VIEWER_ROLES), false);
  assert.equal(matchesAllowedRoles('OPERATOR', NON_VIEWER_ROLES), true);
  assert.equal(matchesAllowedRoles('ACCOUNTANT', NON_VIEWER_ROLES), true);
});

runTest('OFFICIAL_PLANS gates canAccountantErp exclusively to SCALE while preserving Starter/Growth/Scale prices', () => {
  assert.equal(OFFICIAL_PLANS.FREE_KHATA.entitlements.canAccountantErp, false);
  assert.equal(OFFICIAL_PLANS.STARTER.entitlements.canAccountantErp, false);
  assert.equal(OFFICIAL_PLANS.GROWTH.entitlements.canAccountantErp, false);
  assert.equal(OFFICIAL_PLANS.SCALE.entitlements.canAccountantErp, true);

  // Verify commercial monthly prices remain ₹199 / ₹499 / ₹999
  assert.equal(OFFICIAL_PLANS.STARTER.pricing.MONTHLY.totalPrice, 199);
  assert.equal(OFFICIAL_PLANS.GROWTH.pricing.MONTHLY.totalPrice, 499);
  assert.equal(OFFICIAL_PLANS.SCALE.pricing.MONTHLY.totalPrice, 999);
});

runTest('hashInviteToken is deterministic SHA-256 and immune to surrounding whitespace', () => {
  const token = 'abc123token456';
  const h1 = hashInviteToken(token);
  const h2 = hashInviteToken(`  ${token}  `);
  const h3 = hashInviteToken('different-token');

  assert.equal(h1.length, 64);
  assert.match(h1, /^[a-f0-9]{64}$/);
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

runTest('Indian FY utilities (Apr 1 - Mar 31) and statutory deadline generator work accurately', () => {
  // March 31, 2026 belongs to FY 2025-2026
  assert.equal(getIndianFyStartYear(new Date('2026-03-31T18:00:00Z')), 2025);
  // April 1, 2026 starts FY 2026-2027
  assert.equal(getIndianFyStartYear(new Date('2026-04-01T00:00:00Z')), 2026);

  const fyWindow = buildIndianFyWindow(2026);
  assert.equal(fyWindow.code, '2026-2027');
  assert.equal(fyWindow.label, 'FY 2026-27');
  assert.equal(fyWindow.startDate.toISOString(), '2026-04-01T00:00:00.000Z');
  assert.equal(fyWindow.endDate.toISOString(), '2027-03-31T23:59:59.999Z');

  const parsed = parseIndianFyCode('2025-2026');
  assert.equal(parsed.startYear, 2025);
  assert.equal(parsed.startDate.toISOString(), '2025-04-01T00:00:00.000Z');
  assert.equal(parsed.endDate.toISOString(), '2026-03-31T23:59:59.999Z');

  const deadlines = computeUpcomingStatutoryDeadlines(
    '2026-2027',
    new Date('2026-11-05T10:00:00Z')
  );
  assert.equal(deadlines.length, 6);
  assert.equal(
    deadlines.every(
      (d) =>
        Boolean(d.returnType) &&
        Boolean(d.periodLabel) &&
        /^\d{4}-\d{2}-\d{2}$/.test(d.dueDate) &&
        ['UPCOMING', 'DUE_SOON', 'OVERDUE'].includes(d.statusHint) &&
        Number.isFinite(d.daysRemaining)
    ),
    true
  );
  // Sorted ascending by dueDate
  for (let i = 1; i < deadlines.length; i++) {
    assert.ok(deadlines[i - 1].dueDate <= deadlines[i].dueDate);
  }
});

console.log('ALL ERP PHASE 1 UNIT TESTS PASSED');

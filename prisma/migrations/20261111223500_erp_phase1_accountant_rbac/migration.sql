-- Phase 1: Accountant Role, Multi-Business Access, Branches, Financial Years, Approvals & Audit Trail
-- Additive & backward-compatible migration (preserves all existing roles, memberships, sessions, and data)

-- 1. Extend BusinessRole enum with enterprise ERP roles
ALTER TYPE "BusinessRole" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "BusinessRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "BusinessRole" ADD VALUE IF NOT EXISTS 'OPERATOR';
ALTER TYPE "BusinessRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- 2. Create Phase 1 enums
CREATE TYPE "AccessScopeType" AS ENUM ('ALL', 'SELECTED');
CREATE TYPE "AccountantInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- 3. Extend BusinessMembership with scoped RBAC fields (preserving existing rows as isActive = true)
ALTER TABLE "BusinessMembership"
  ADD COLUMN IF NOT EXISTS "branchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "financialYears" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "invitedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "BusinessMembership_isActive_idx" ON "BusinessMembership"("isActive");

-- 4. Create Branch table
CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "gstin" TEXT,
  "state" TEXT,
  "city" TEXT,
  "address" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_businessId_code_key" ON "Branch"("businessId", "code");
CREATE INDEX IF NOT EXISTS "Branch_businessId_idx" ON "Branch"("businessId");
CREATE INDEX IF NOT EXISTS "Branch_businessId_isActive_idx" ON "Branch"("businessId", "isActive");

-- 5. Extend Session with optional active branchId
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "branchId" TEXT;

CREATE INDEX IF NOT EXISTS "Session_branchId_idx" ON "Session"("branchId");

-- 6. Create FinancialYear table
CREATE TABLE IF NOT EXISTS "FinancialYear" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinancialYear_businessId_code_key" ON "FinancialYear"("businessId", "code");
CREATE INDEX IF NOT EXISTS "FinancialYear_businessId_idx" ON "FinancialYear"("businessId");
CREATE INDEX IF NOT EXISTS "FinancialYear_businessId_isActive_idx" ON "FinancialYear"("businessId", "isActive");

-- 7. Create RBAC Role, Permission, RolePermission tables
CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT NOT NULL,
  "businessId" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_businessId_key_key" ON "Role"("businessId", "key");
CREATE INDEX IF NOT EXISTS "Role_key_idx" ON "Role"("key");

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Permission_code_key" ON "Permission"("code");
CREATE INDEX IF NOT EXISTS "Permission_module_idx" ON "Permission"("module");

CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- 8. Create AccountantInvitation table
CREATE TABLE IF NOT EXISTS "AccountantInvitation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "invitedName" TEXT,
  "invitedByUserId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "branchScope" "AccessScopeType" NOT NULL DEFAULT 'ALL',
  "branchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "fyScope" "AccessScopeType" NOT NULL DEFAULT 'ALL',
  "financialYears" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "canApproveSensitive" BOOLEAN NOT NULL DEFAULT false,
  "canFileGst" BOOLEAN NOT NULL DEFAULT false,
  "status" "AccountantInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "acceptedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountantInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountantInvitation_tokenHash_key" ON "AccountantInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "AccountantInvitation_businessId_status_idx" ON "AccountantInvitation"("businessId", "status");
CREATE INDEX IF NOT EXISTS "AccountantInvitation_invitedEmail_status_idx" ON "AccountantInvitation"("invitedEmail", "status");
CREATE INDEX IF NOT EXISTS "AccountantInvitation_tokenHash_idx" ON "AccountantInvitation"("tokenHash");

-- 9. Create AccountantBusinessAccess table
CREATE TABLE IF NOT EXISTS "AccountantBusinessAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "grantedByUserId" TEXT NOT NULL,
  "branchScope" "AccessScopeType" NOT NULL DEFAULT 'ALL',
  "branchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "fyScope" "AccessScopeType" NOT NULL DEFAULT 'ALL',
  "financialYears" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "canApproveSensitive" BOOLEAN NOT NULL DEFAULT false,
  "canFileGst" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountantBusinessAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountantBusinessAccess_userId_businessId_key" ON "AccountantBusinessAccess"("userId", "businessId");
CREATE INDEX IF NOT EXISTS "AccountantBusinessAccess_userId_isActive_idx" ON "AccountantBusinessAccess"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "AccountantBusinessAccess_businessId_isActive_idx" ON "AccountantBusinessAccess"("businessId", "isActive");

-- 10. Create ApprovalRequest table
CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "decidedByUserId" TEXT,
  "requestType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "payload" JSONB,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decisionNotes" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApprovalRequest_businessId_status_idx" ON "ApprovalRequest"("businessId", "status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_requestedByUserId_idx" ON "ApprovalRequest"("requestedByUserId");

-- 11. Create AuditEvent table
CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorEmail" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "previousValue" JSONB,
  "newValue" JSONB,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditEvent_businessId_createdAt_idx" ON "AuditEvent"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditEvent_businessId_entityType_entityId_idx" ON "AuditEvent"("businessId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- 12. Create FeatureFlag table
CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id" TEXT NOT NULL,
  "businessId" TEXT,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_businessId_key_key" ON "FeatureFlag"("businessId", "key");
CREATE INDEX IF NOT EXISTS "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- 13. Add Foreign Keys
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Role" ADD CONSTRAINT "Role_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountantInvitation" ADD CONSTRAINT "AccountantInvitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountantInvitation" ADD CONSTRAINT "AccountantInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountantInvitation" ADD CONSTRAINT "AccountantInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountantBusinessAccess" ADD CONSTRAINT "AccountantBusinessAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountantBusinessAccess" ADD CONSTRAINT "AccountantBusinessAccess_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountantBusinessAccess" ADD CONSTRAINT "AccountantBusinessAccess_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

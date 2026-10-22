import prisma from '@/lib/prisma';
import crypto from 'crypto';
import {
  HouseholdRole,
  HouseholdTransactionType,
  PaymentMethod,
  HouseholdInviteStatus,
  Prisma,
} from '@prisma/client';
import { ALL_DEFAULT_CATEGORIES, BILLS_AND_RECHARGE_TYPES } from './defaultCategories';

export interface CreateHouseholdInput {
  name: string;
  currency?: string;
  monthlyBudget?: number;
  budgetStartDay?: number;
}

export interface TransactionFilterParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  month?: string;     // YYYY-MM
  type?: HouseholdTransactionType;
  categoryId?: string;
  subcategory?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  memberId?: string;
  isShared?: boolean | 'ALL';
  billType?: string;
  settlementStatus?: string;
}

export interface SplitAllocationInput {
  memberId: string;
  amount: number;
  notes?: string;
}

export interface ContributionInput {
  memberId: string;
  amount: number;
}

export interface CreateTransactionInput {
  type: HouseholdTransactionType;
  amount: number;
  categoryId?: string | null;
  categoryName?: string;
  subcategory?: string | null;
  date?: string | Date;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  payeeMerchant?: string | null;
  notes?: string | null;

  // Split and Payer
  paidByMemberId?: string | null;
  paidByName?: string | null;
  isShared?: boolean;
  splitType?: 'EQUAL' | 'CUSTOM' | null;
  splits?: SplitAllocationInput[];
  contributions?: ContributionInput[];

  // Bills & Recharge
  billType?: string | null;
  billProvider?: string | null;
  billConsumerId?: string | null;
  billPeriod?: string | null;
  billDueDate?: string | Date | null;
  billReferenceNo?: string | null;
}

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  categoryId?: string;
  subcategory?: string;
  memberId?: string;
  isShared?: boolean | 'ALL';
  billType?: string;
  search?: string;
}

// ============================================================================
// FINANCIAL CALCULATION & SPLIT ALGORITHMS
// ============================================================================

/**
 * Calculates equal split allocations among selected members with exact paise rounding.
 * Guarantees that the sum of allocated amounts equals the original expense amount exactly.
 */
export function calculateEqualSplit(
  totalAmount: number,
  memberIds: string[]
): { memberId: string; amount: number }[] {
  if (!memberIds || memberIds.length === 0) return [];
  const cleanAmount = Math.max(0, Number(totalAmount) || 0);
  const totalPaise = Math.round(cleanAmount * 100);
  const n = memberIds.length;
  const basePaise = Math.floor(totalPaise / n);
  const remainder = totalPaise % n;

  return memberIds.map((memberId, index) => {
    const paise = basePaise + (index < remainder ? 1 : 0);
    return {
      memberId,
      amount: paise / 100,
    };
  });
}

/**
 * Validates a custom split allocation.
 * Checks that all amounts are non-negative and their sum matches totalAmount to the exact paisa.
 */
export function validateCustomSplit(
  totalAmount: number,
  splits: { memberId: string; amount: number }[]
): { valid: boolean; error?: string } {
  if (!splits || splits.length < 2) {
    return { valid: false, error: 'A split expense must be divided among at least 2 family members.' };
  }

  const cleanTotal = Math.max(0, Number(totalAmount) || 0);
  const totalPaise = Math.round(cleanTotal * 100);
  let sumPaise = 0;

  for (const s of splits) {
    const amt = Number(s.amount);
    if (isNaN(amt) || amt < 0) {
      return { valid: false, error: 'Each member share must be a non-negative amount.' };
    }
    sumPaise += Math.round(amt * 100);
  }

  if (sumPaise !== totalPaise) {
    const allocated = (sumPaise / 100).toFixed(2);
    const expected = (totalPaise / 100).toFixed(2);
    const diff = ((totalPaise - sumPaise) / 100).toFixed(2);
    return {
      valid: false,
      error: `Sum of member shares (₹${allocated}) does not match the total expense (₹${expected}). Difference: ₹${diff}.`,
    };
  }

  return { valid: true };
}

/**
 * Validates multiple contributor payments.
 */
export function validateContributions(
  totalAmount: number,
  contributions: { memberId: string; amount: number }[]
): { valid: boolean; error?: string } {
  if (!contributions || contributions.length === 0) return { valid: true };

  const totalPaise = Math.round(Number(totalAmount) * 100);
  let sumPaise = 0;

  for (const c of contributions) {
    const amt = Number(c.amount);
    if (isNaN(amt) || amt < 0) {
      return { valid: false, error: 'Each contribution amount must be non-negative.' };
    }
    sumPaise += Math.round(amt * 100);
  }

  if (sumPaise !== totalPaise) {
    return {
      valid: false,
      error: `Sum of member payments (₹${(sumPaise / 100).toFixed(2)}) must equal the total expense (₹${(totalPaise / 100).toFixed(2)}).`,
    };
  }

  return { valid: true };
}

// ============================================================================
// HOUSEHOLD CORE OPERATIONS
// ============================================================================

/**
 * Creates a new household, marks creator as OWNER, and seeds default categories with subcategories.
 */
export async function createHousehold(userId: string, input: CreateHouseholdInput) {
  const trimmedName = input.name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Household name must be at least 2 characters long.');
  }

  const budget = typeof input.monthlyBudget === 'number' && input.monthlyBudget >= 0
    ? input.monthlyBudget
    : 0;

  return await prisma.$transaction(async (tx) => {
    // 1. Create Household
    const household = await tx.household.create({
      data: {
        name: trimmedName,
        currency: input.currency?.trim() || 'INR',
        monthlyBudget: budget,
        budgetStartDay: Math.min(28, Math.max(1, input.budgetStartDay || 1)),
      },
    });

    // 2. Link Creator as OWNER
    await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId,
        role: HouseholdRole.OWNER,
      },
    });

    // 3. Seed initial default categories for this household
    const categoryData = ALL_DEFAULT_CATEGORIES.map((cat) => ({
      householdId: household.id,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      subcategories: cat.subcategories || [],
    }));

    await tx.householdCategory.createMany({
      data: categoryData,
      skipDuplicates: true,
    });

    // 4. Record current month budget if specified
    if (budget > 0) {
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      await tx.householdMonthlyBudget.create({
        data: {
          householdId: household.id,
          monthYear,
          amount: budget,
        },
      });
    }

    return household;
  });
}

/**
 * Retrieves all households an authenticated user belongs to.
 */
export async function getUserHouseholds(userId: string) {
  const memberships = await prisma.householdMember.findMany({
    where: {
      userId,
      household: { isArchived: false },
    },
    include: {
      household: {
        include: {
          _count: {
            select: {
              members: true,
              transactions: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((m) => ({
    id: m.household.id,
    name: m.household.name,
    currency: m.household.currency,
    monthlyBudget: m.household.monthlyBudget || 0,
    role: m.role,
    membersCount: m.household._count.members,
    transactionsCount: m.household._count.transactions,
    createdAt: m.household.createdAt,
  }));
}

/**
 * Retrieves detailed household info.
 */
export async function getHouseholdDetail(householdId: string) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      _count: {
        select: {
          members: true,
          transactions: true,
        },
      },
    },
  });

  if (!household || household.isArchived) {
    throw new Error('Household not found.');
  }

  return household;
}

/**
 * Updates household settings (name, monthly budget, etc.).
 */
export async function updateHouseholdSettings(
  householdId: string,
  data: { name?: string; monthlyBudget?: number; budgetStartDay?: number }
) {
  const updateData: Prisma.HouseholdUpdateInput = {};
  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length < 2) throw new Error('Household name must be at least 2 characters.');
    updateData.name = trimmed;
  }
  if (data.monthlyBudget !== undefined) {
    updateData.monthlyBudget = Math.max(0, Number(data.monthlyBudget) || 0);
  }
  if (data.budgetStartDay !== undefined) {
    updateData.budgetStartDay = Math.min(28, Math.max(1, Number(data.budgetStartDay) || 1));
  }

  return await prisma.household.update({
    where: { id: householdId },
    data: updateData,
  });
}

// ============================================================================
// MODULE 1: EXPENSE CATEGORIES & CATEGORY MANAGEMENT
// ============================================================================

/**
 * Retrieves categories for a household with optional search, type filtering, and subcategories.
 * Automatically ensures default categories exist for the household without duplicates.
 */
export async function getHouseholdCategories(
  householdId: string,
  options: {
    search?: string;
    type?: HouseholdTransactionType;
    includeArchived?: boolean;
  } = {}
) {
  const where: Prisma.HouseholdCategoryWhereInput = {
    householdId,
  };

  if (!options.includeArchived) {
    where.isArchived = false;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    where.name = { contains: term, mode: 'insensitive' };
  }

  let categories = await prisma.householdCategory.findMany({
    where,
    orderBy: [{ isDefault: 'desc' }, { type: 'asc' }, { name: 'asc' }],
  });

  // If newly requested categories are missing in this household, sync them smoothly
  if (categories.length === 0 && !options.search) {
    const categoryData = ALL_DEFAULT_CATEGORIES.map((cat) => ({
      householdId,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
      subcategories: cat.subcategories || [],
    }));

    await prisma.householdCategory.createMany({
      data: categoryData,
      skipDuplicates: true,
    });

    categories = await prisma.householdCategory.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { type: 'asc' }, { name: 'asc' }],
    });
  }

  return categories;
}

/**
 * Creates a custom category with case-insensitive duplicate prevention within the same household.
 */
export async function createHouseholdCategory(
  householdId: string,
  data: {
    name: string;
    type: HouseholdTransactionType;
    icon?: string;
    color?: string;
    monthlyBudget?: number;
    subcategories?: string[];
  }
) {
  const trimmedName = data.name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Category name must be at least 2 characters long.');
  }

  // Case-insensitive duplicate prevention
  const existing = await prisma.householdCategory.findFirst({
    where: {
      householdId,
      type: data.type,
      name: { equals: trimmedName, mode: 'insensitive' },
    },
  });

  if (existing) {
    if (existing.isArchived) {
      // Re-activate if was archived
      return await prisma.householdCategory.update({
        where: { id: existing.id },
        data: {
          isArchived: false,
          icon: data.icon || existing.icon,
          color: data.color || existing.color,
          monthlyBudget: data.monthlyBudget !== undefined ? Number(data.monthlyBudget) : existing.monthlyBudget,
          subcategories: data.subcategories || existing.subcategories,
        },
      });
    }
    throw new Error(`A ${data.type.toLowerCase()} category with the name "${trimmedName}" already exists in this household.`);
  }

  return await prisma.householdCategory.create({
    data: {
      householdId,
      name: trimmedName,
      type: data.type,
      icon: data.icon || 'Tag',
      color: data.color || 'slate',
      monthlyBudget: data.monthlyBudget ? Math.max(0, Number(data.monthlyBudget)) : null,
      subcategories: data.subcategories || [],
      isDefault: false,
      isArchived: false,
    },
  });
}

/**
 * Updates a custom category with duplicate prevention and authorization.
 */
export async function updateHouseholdCategory(
  householdId: string,
  categoryId: string,
  data: {
    name?: string;
    icon?: string;
    color?: string;
    monthlyBudget?: number | null;
    subcategories?: string[];
    isArchived?: boolean;
  }
) {
  const category = await prisma.householdCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category || category.householdId !== householdId) {
    throw new Error('Category not found or you do not have permission to modify it.');
  }

  const updateData: Prisma.HouseholdCategoryUpdateInput = {};

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length < 2) throw new Error('Category name must be at least 2 characters.');

    // Check duplicate if name changed
    if (trimmed.toLowerCase() !== category.name.toLowerCase()) {
      const duplicate = await prisma.householdCategory.findFirst({
        where: {
          householdId,
          type: category.type,
          name: { equals: trimmed, mode: 'insensitive' },
          id: { not: categoryId },
        },
      });
      if (duplicate) {
        throw new Error(`A category named "${trimmed}" already exists in this household.`);
      }
    }
    updateData.name = trimmed;
  }

  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.monthlyBudget !== undefined) {
    updateData.monthlyBudget = data.monthlyBudget !== null ? Math.max(0, Number(data.monthlyBudget)) : null;
  }
  if (data.subcategories !== undefined) updateData.subcategories = data.subcategories;
  if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;

  return await prisma.householdCategory.update({
    where: { id: categoryId },
    data: updateData,
  });
}

/**
 * Deactivates or archives a category safely.
 * If historical expenses depend on this category, archives it instead of deleting to preserve audit history.
 */
export async function deleteHouseholdCategory(householdId: string, categoryId: string) {
  const category = await prisma.householdCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category || category.householdId !== householdId) {
    throw new Error('Category not found or cannot be modified.');
  }

  const txCount = await prisma.householdTransaction.count({
    where: { categoryId },
  });

  if (txCount > 0) {
    // Historical expenses depend on it: archive instead of hard delete
    const archived = await prisma.householdCategory.update({
      where: { id: categoryId },
      data: { isArchived: true },
    });
    return {
      archived: true,
      category: archived,
      message: `Category "${category.name}" has ${txCount} historical expense records. It was archived to preserve your financial audit trail.`,
    };
  }

  // No historical expenses: can be safely hard deleted
  const deleted = await prisma.householdCategory.delete({
    where: { id: categoryId },
  });

  return {
    deleted: true,
    category: deleted,
    message: `Category "${category.name}" was permanently removed.`,
  };
}

// ============================================================================
// MODULE 2: TRANSACTIONS, FAMILY EXPENSE SPLITTING & SETTLEMENTS
// ============================================================================

/**
 * Filterable, paginated transaction register for household.
 */
export async function getHouseholdTransactions(
  householdId: string,
  params: TransactionFilterParams = {}
) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));
  const skip = (page - 1) * pageSize;

  const where: Prisma.HouseholdTransactionWhereInput = {
    householdId,
  };

  if (params.type) {
    where.type = params.type;
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params.subcategory && params.subcategory.trim()) {
    where.subcategory = params.subcategory.trim();
  }

  if (params.billType && params.billType.trim()) {
    where.billType = params.billType.trim();
  }

  if (params.isShared !== undefined && params.isShared !== 'ALL') {
    where.isShared = Boolean(params.isShared);
  }

  // Member filter: match either paidByMemberId OR member in splits
  if (params.memberId && params.memberId.trim()) {
    where.OR = [
      { paidByMemberId: params.memberId.trim() },
      { splits: { some: { memberId: params.memberId.trim() } } },
      { contributions: { some: { memberId: params.memberId.trim() } } },
    ];
  }

  // Date filtering
  if (params.month && params.month.trim()) {
    const [yearStr, monthStr] = params.month.trim().split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    where.date = { gte: startOfMonth, lte: endOfMonth };
  } else if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) {
      where.date.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    }
    if (params.endDate) {
      where.date.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }
  }

  // Search filter
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    const searchConditions: Prisma.HouseholdTransactionWhereInput[] = [
      { description: { contains: term, mode: 'insensitive' } },
      { payeeMerchant: { contains: term, mode: 'insensitive' } },
      { categoryName: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
      { billProvider: { contains: term, mode: 'insensitive' } },
      { billConsumerId: { contains: term, mode: 'insensitive' } },
      { paidByName: { contains: term, mode: 'insensitive' } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const [totalCount, transactions, totalSum] = await Promise.all([
    prisma.householdTransaction.count({ where }),
    prisma.householdTransaction.findMany({
      where,
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        paidByMember: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        splits: {
          include: {
            member: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        contributions: {
          include: {
            member: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.householdTransaction.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      categoryIcon: t.category?.icon || 'Receipt',
      categoryColor: t.category?.color || 'slate',
      subcategory: t.subcategory,
      date: t.date,
      paymentMethod: t.paymentMethod,
      description: t.description,
      payeeMerchant: t.payeeMerchant,
      notes: t.notes,
      createdById: t.createdById,
      createdByName: t.createdBy.name,
      createdAt: t.createdAt,

      // Splitting & Payer
      isShared: t.isShared,
      splitType: t.splitType,
      paidByMemberId: t.paidByMemberId,
      paidByName: t.paidByName || t.paidByMember?.user.name || t.createdBy.name,
      splits: t.splits.map((s) => ({
        id: s.id,
        memberId: s.memberId,
        memberName: s.member.user.name,
        allocatedAmount: s.allocatedAmount,
        notes: s.notes,
      })),
      contributions: t.contributions.map((c) => ({
        id: c.id,
        memberId: c.memberId,
        memberName: c.member.user.name,
        amount: c.amount,
      })),

      // Bills & Recharge
      billType: t.billType,
      billProvider: t.billProvider,
      billConsumerId: t.billConsumerId,
      billPeriod: t.billPeriod,
      billDueDate: t.billDueDate,
      billReferenceNo: t.billReferenceNo,
    })),
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      totalAmount: Math.round((totalSum._sum.amount || 0) * 100) / 100,
    },
  };
}

/**
 * Creates a new household income or expense transaction with splitting and bill support.
 */
export async function createHouseholdTransaction(
  householdId: string,
  userId: string,
  data: CreateTransactionInput
) {
  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
    throw new Error('Please enter a valid positive monetary amount.');
  }

  if (!['INCOME', 'EXPENSE'].includes(data.type)) {
    throw new Error('Invalid transaction type. Must be INCOME or EXPENSE.');
  }

  const cleanAmount = Math.round(amount * 100) / 100;

  // Resolve Category
  let categoryName = data.categoryName?.trim();
  let categoryId = data.categoryId || null;

  if (categoryId) {
    const cat = await prisma.householdCategory.findUnique({
      where: { id: categoryId },
    });
    if (cat && (cat.householdId === householdId || cat.householdId === null)) {
      categoryName = cat.name;
    } else {
      categoryId = null;
    }
  }

  if (!categoryName) {
    categoryName = data.type === 'INCOME' ? 'Other Income' : 'Other Expenses';
  }

  // Resolve Payer Member
  let paidByMemberId = data.paidByMemberId?.trim() || null;
  let paidByName = data.paidByName?.trim() || null;

  if (!paidByMemberId) {
    const currentMember = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
      include: { user: true },
    });
    if (currentMember) {
      paidByMemberId = currentMember.id;
      paidByName = currentMember.user.name;
    }
  } else {
    const member = await prisma.householdMember.findUnique({
      where: { id: paidByMemberId },
      include: { user: true },
    });
    if (!member || member.householdId !== householdId) {
      throw new Error('Selected paying member does not belong to this household.');
    }
    paidByName = member.user.name;
  }

  // Validate Splitting if shared expense
  const isShared = Boolean(data.isShared && data.type === 'EXPENSE');
  let finalSplits: { memberId: string; amount: number; notes?: string }[] = [];

  if (isShared) {
    const splitType = data.splitType || 'EQUAL';

    if (splitType === 'EQUAL') {
      const memberIds = (data.splits || []).map((s) => s.memberId);
      if (memberIds.length < 2) {
        throw new Error('Shared expenses must be split between at least two family members.');
      }
      finalSplits = calculateEqualSplit(cleanAmount, memberIds);
    } else if (splitType === 'CUSTOM') {
      const customSplits = (data.splits || []).map((s) => ({
        memberId: s.memberId,
        amount: Math.round(Number(s.amount) * 100) / 100,
        notes: s.notes,
      }));
      const validation = validateCustomSplit(cleanAmount, customSplits);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      finalSplits = customSplits;
    }

    // Verify all split members belong to household
    const memberIds = finalSplits.map((s) => s.memberId);
    const validMembersCount = await prisma.householdMember.count({
      where: {
        id: { in: memberIds },
        householdId,
      },
    });
    if (validMembersCount !== memberIds.length) {
      throw new Error('One or more selected family members do not belong to this household.');
    }
  }

  // Validate Multiple Contributions if provided
  let finalContributions: { memberId: string; amount: number }[] = [];
  if (data.contributions && data.contributions.length > 0) {
    const validation = validateContributions(cleanAmount, data.contributions);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    finalContributions = data.contributions.map((c) => ({
      memberId: c.memberId,
      amount: Math.round(Number(c.amount) * 100) / 100,
    }));
  } else if (paidByMemberId) {
    // Default: 100% contribution paid by the primary payer
    finalContributions = [{ memberId: paidByMemberId, amount: cleanAmount }];
  }

  const txDate = data.date ? new Date(data.date) : new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Create Transaction record
    const createdTx = await tx.householdTransaction.create({
      data: {
        householdId,
        createdById: userId,
        type: data.type,
        amount: cleanAmount,
        categoryId,
        categoryName,
        subcategory: data.subcategory?.trim() || null,
        date: txDate,
        paymentMethod: data.paymentMethod || PaymentMethod.CASH,
        description: data.description?.trim() || null,
        payeeMerchant: data.payeeMerchant?.trim() || null,
        notes: data.notes?.trim() || null,

        // Splitting & Payer
        isShared,
        splitType: isShared ? (data.splitType || 'EQUAL') : null,
        paidByMemberId,
        paidByName,

        // Bills & Recharge
        billType: data.billType?.trim() || null,
        billProvider: data.billProvider?.trim() || null,
        billConsumerId: data.billConsumerId?.trim() || null,
        billPeriod: data.billPeriod?.trim() || null,
        billDueDate: data.billDueDate ? new Date(data.billDueDate) : null,
        billReferenceNo: data.billReferenceNo?.trim() || null,
      },
    });

    // 2. Create splits if shared
    if (isShared && finalSplits.length > 0) {
      await tx.householdExpenseSplit.createMany({
        data: finalSplits.map((s) => ({
          transactionId: createdTx.id,
          memberId: s.memberId,
          allocatedAmount: s.amount,
          notes: s.notes || null,
        })),
      });
    }

    // 3. Create contributions if shared expense
    if (isShared && data.type === 'EXPENSE' && finalContributions.length > 0) {
      await tx.householdExpenseContribution.createMany({
        data: finalContributions.map((c) => ({
          transactionId: createdTx.id,
          memberId: c.memberId,
          amount: c.amount,
        })),
      });
    }

    return createdTx;
  });
}

/**
 * Updates an existing transaction with permission checks and transaction consistency.
 */
export async function updateHouseholdTransaction(
  householdId: string,
  userId: string,
  userRole: HouseholdRole,
  transactionId: string,
  data: Partial<CreateTransactionInput>
) {
  const existing = await prisma.householdTransaction.findUnique({
    where: { id: transactionId },
    include: { splits: true, contributions: true },
  });

  if (!existing || existing.householdId !== householdId) {
    throw new Error('Transaction record not found in this household.');
  }

  if (userRole === HouseholdRole.VIEWER) {
    throw new Error('Viewers have read-only access and cannot edit transactions.');
  }
  if (userRole === HouseholdRole.MEMBER && existing.createdById !== userId) {
    throw new Error('Members may only edit transactions they recorded.');
  }

  const newAmount = data.amount !== undefined ? Math.round(Number(data.amount) * 100) / 100 : existing.amount;
  if (isNaN(newAmount) || newAmount <= 0) {
    throw new Error('Please enter a valid positive monetary amount.');
  }

  const newType = data.type || existing.type;
  const isShared = data.isShared !== undefined ? Boolean(data.isShared && newType === 'EXPENSE') : existing.isShared;

  return await prisma.$transaction(async (tx) => {
    const updateData: Prisma.HouseholdTransactionUpdateInput = {
      amount: newAmount,
      type: newType,
    };

    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const cat = await tx.householdCategory.findUnique({ where: { id: data.categoryId } });
        if (cat && (cat.householdId === householdId || cat.householdId === null)) {
          updateData.category = { connect: { id: cat.id } };
          updateData.categoryName = cat.name;
        }
      } else {
        updateData.category = { disconnect: true };
      }
    }

    if (data.categoryName !== undefined && data.categoryName.trim()) {
      updateData.categoryName = data.categoryName.trim();
    }

    if (data.subcategory !== undefined) {
      updateData.subcategory = data.subcategory?.trim() || null;
    }

    if (data.date !== undefined) {
      updateData.date = new Date(data.date);
    }

    if (data.paymentMethod !== undefined) {
      updateData.paymentMethod = data.paymentMethod;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.payeeMerchant !== undefined) {
      updateData.payeeMerchant = data.payeeMerchant ? data.payeeMerchant.trim() : null;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes ? data.notes.trim() : null;
    }

    // Payer
    if (data.paidByMemberId !== undefined) {
      if (data.paidByMemberId) {
        const member = await tx.householdMember.findUnique({
          where: { id: data.paidByMemberId },
          include: { user: true },
        });
        if (!member || member.householdId !== householdId) {
          throw new Error('Selected paying member is invalid.');
        }
        updateData.paidByMember = { connect: { id: member.id } };
        updateData.paidByName = member.user.name;
      } else {
        updateData.paidByMember = { disconnect: true };
        updateData.paidByName = null;
      }
    }

    // Bills
    if (data.billType !== undefined) updateData.billType = data.billType?.trim() || null;
    if (data.billProvider !== undefined) updateData.billProvider = data.billProvider?.trim() || null;
    if (data.billConsumerId !== undefined) updateData.billConsumerId = data.billConsumerId?.trim() || null;
    if (data.billPeriod !== undefined) updateData.billPeriod = data.billPeriod?.trim() || null;
    if (data.billDueDate !== undefined) updateData.billDueDate = data.billDueDate ? new Date(data.billDueDate) : null;
    if (data.billReferenceNo !== undefined) updateData.billReferenceNo = data.billReferenceNo?.trim() || null;

    updateData.isShared = isShared;
    updateData.splitType = isShared ? (data.splitType || existing.splitType || 'EQUAL') : null;

    // Splits update
    if (data.splits !== undefined || data.splitType !== undefined || data.amount !== undefined) {
      await tx.householdExpenseSplit.deleteMany({ where: { transactionId } });

      if (isShared) {
        const splitType = data.splitType || existing.splitType || 'EQUAL';
        let finalSplits: { memberId: string; amount: number; notes?: string }[] = [];

        if (splitType === 'EQUAL') {
          const memberIds = (data.splits || existing.splits).map((s) => s.memberId);
          if (memberIds.length < 2) {
            throw new Error('Shared expenses must be split between at least two family members.');
          }
          finalSplits = calculateEqualSplit(newAmount, memberIds);
        } else {
          const customSplits = (data.splits || []).map((s) => ({
            memberId: s.memberId,
            amount: Math.round(Number(s.amount) * 100) / 100,
            notes: s.notes,
          }));
          const validation = validateCustomSplit(newAmount, customSplits);
          if (!validation.valid) throw new Error(validation.error);
          finalSplits = customSplits;
        }

        await tx.householdExpenseSplit.createMany({
          data: finalSplits.map((s) => ({
            transactionId,
            memberId: s.memberId,
            allocatedAmount: s.amount,
            notes: s.notes || null,
          })),
        });
      }
    }

    // Contributions update
    if (data.contributions !== undefined || data.amount !== undefined || data.paidByMemberId !== undefined) {
      await tx.householdExpenseContribution.deleteMany({ where: { transactionId } });

      if (isShared && newType === 'EXPENSE') {
        let finalContributions: { memberId: string; amount: number }[] = [];
        if (data.contributions && data.contributions.length > 0) {
          const validation = validateContributions(newAmount, data.contributions);
          if (!validation.valid) throw new Error(validation.error);
          finalContributions = data.contributions;
        } else {
          const targetPaidBy = data.paidByMemberId !== undefined ? data.paidByMemberId : existing.paidByMemberId;
          if (targetPaidBy) {
            finalContributions = [{ memberId: targetPaidBy, amount: newAmount }];
          }
        }

        if (finalContributions.length > 0) {
          await tx.householdExpenseContribution.createMany({
            data: finalContributions.map((c) => ({
              transactionId,
              memberId: c.memberId,
              amount: c.amount,
            })),
          });
        }
      }
    }

    return await tx.householdTransaction.update({
      where: { id: transactionId },
      data: updateData,
    });
  });
}

/**
 * Deletes a transaction safely, cascading its splits and contributions.
 */
export async function deleteHouseholdTransaction(
  householdId: string,
  userId: string,
  userRole: HouseholdRole,
  transactionId: string
) {
  const existing = await prisma.householdTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!existing || existing.householdId !== householdId) {
    throw new Error('Transaction record not found in this household.');
  }

  if (userRole === HouseholdRole.VIEWER) {
    throw new Error('Viewers have read-only access and cannot delete transactions.');
  }
  if (userRole === HouseholdRole.MEMBER && existing.createdById !== userId) {
    throw new Error('Members may only delete transactions they recorded.');
  }

  return await prisma.householdTransaction.delete({
    where: { id: transactionId },
  });
}

// ============================================================================
// SETTLEMENTS & MEMBER BALANCES
// ============================================================================

/**
 * Calculates current member-wise balances and pairwise debt settlements.
 *
 * Balance Formula for Member M:
 *   Net Balance = (Total Contributions Paid by M) + (Total Settlements Paid by M)
 *                 - (Total Allocated Shares of M) - (Total Settlements Received by M)
 *
 * If Net Balance > 0: Member is owed money (+receivable)
 * If Net Balance < 0: Member owes money (-payable / outstanding)
 * Sum of Net Balances across all members in the household strictly equals 0.00!
 */
export async function getHouseholdBalances(householdId: string) {
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const [splits, contributions, settlements] = await Promise.all([
    prisma.householdExpenseSplit.findMany({
      where: { transaction: { householdId, type: 'EXPENSE', isShared: true } },
      include: { transaction: true },
    }),
    prisma.householdExpenseContribution.findMany({
      where: { transaction: { householdId, type: 'EXPENSE', isShared: true } },
      include: { transaction: true },
    }),
    prisma.householdSettlement.findMany({
      where: { householdId },
      orderBy: { date: 'desc' },
      include: {
        payerMember: { include: { user: { select: { name: true } } } },
        receiverMember: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  const memberMap: Record<string, {
    memberId: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    role: HouseholdRole;
    totalExpensePaid: number;
    totalShareAllocated: number;
    settlementsPaid: number;
    settlementsReceived: number;
  }> = {};

  for (const m of members) {
    memberMap[m.id] = {
      memberId: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      role: m.role,
      totalExpensePaid: 0,
      totalShareAllocated: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
    };
  }

  for (const c of contributions) {
    if (memberMap[c.memberId]) {
      memberMap[c.memberId].totalExpensePaid += c.amount;
    }
  }

  for (const s of splits) {
    if (memberMap[s.memberId]) {
      memberMap[s.memberId].totalShareAllocated += s.allocatedAmount;
    }
  }

  for (const set of settlements) {
    if (memberMap[set.payerMemberId]) {
      memberMap[set.payerMemberId].settlementsPaid += set.amount;
    }
    if (memberMap[set.receiverMemberId]) {
      memberMap[set.receiverMemberId].settlementsReceived += set.amount;
    }
  }

  // Calculate net balances with exact paise rounding
  let totalSharedExpenseVolume = 0;
  const memberBalances = Object.values(memberMap).map((m) => {
    totalSharedExpenseVolume += m.totalShareAllocated;
    const paidPaise = Math.round(m.totalExpensePaid * 100) + Math.round(m.settlementsPaid * 100);
    const owedPaise = Math.round(m.totalShareAllocated * 100) + Math.round(m.settlementsReceived * 100);
    const netPaise = paidPaise - owedPaise;
    const netBalance = netPaise / 100;

    return {
      memberId: m.memberId,
      userId: m.userId,
      name: m.name,
      email: m.email,
      phone: m.phone,
      role: m.role,
      totalExpensePaid: Math.round(m.totalExpensePaid * 100) / 100,
      totalShareAllocated: Math.round(m.totalShareAllocated * 100) / 100,
      settlementsPaid: Math.round(m.settlementsPaid * 100) / 100,
      settlementsReceived: Math.round(m.settlementsReceived * 100) / 100,
      netBalance,
      status: netPaise > 0.5 ? ('RECEIVABLE' as const) : netPaise < -0.5 ? ('PAYABLE' as const) : ('SETTLED' as const),
    };
  });

  // Calculate Pairwise Debt Simplification
  const suggestedSettlements: {
    fromMemberId: string;
    fromName: string;
    toMemberId: string;
    toName: string;
    amount: number;
  }[] = [];

  const creditors = memberBalances
    .filter((b) => b.netBalance > 0.005)
    .map((b) => ({ ...b, remaining: Math.round(b.netBalance * 100) }));
  const debtors = memberBalances
    .filter((b) => b.netBalance < -0.005)
    .map((b) => ({ ...b, remaining: Math.round(-b.netBalance * 100) }));

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const cred = creditors[cIdx];
    const debt = debtors[dIdx];
    const settlePaise = Math.min(cred.remaining, debt.remaining);

    if (settlePaise > 0) {
      suggestedSettlements.push({
        fromMemberId: debt.memberId,
        fromName: debt.name,
        toMemberId: cred.memberId,
        toName: cred.name,
        amount: settlePaise / 100,
      });

      cred.remaining -= settlePaise;
      debt.remaining -= settlePaise;
    }

    if (cred.remaining <= 0) cIdx++;
    if (debt.remaining <= 0) dIdx++;
  }

  return {
    members: memberBalances,
    suggestedSettlements,
    recentSettlements: settlements.slice(0, 15).map((s) => ({
      id: s.id,
      payerMemberId: s.payerMemberId,
      payerName: s.payerMember.user.name,
      receiverMemberId: s.receiverMemberId,
      receiverName: s.receiverMember.user.name,
      amount: s.amount,
      date: s.date,
      paymentMethod: s.paymentMethod,
      notes: s.notes,
      createdAt: s.createdAt,
    })),
    totalSharedSpending: Math.round(totalSharedExpenseVolume * 100) / 100,
  };
}

/**
 * Records a settlement / repayment between two household members.
 * Validates that over-settlement is prevented.
 */
export async function createHouseholdSettlement(
  householdId: string,
  operatorUserId: string,
  data: {
    payerMemberId: string;
    receiverMemberId: string;
    amount: number;
    date?: string | Date;
    paymentMethod?: PaymentMethod;
    notes?: string;
  }
) {
  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
    throw new Error('Please enter a valid positive settlement amount.');
  }

  const cleanAmount = Math.round(amount * 100) / 100;

  if (data.payerMemberId === data.receiverMemberId) {
    throw new Error('Payer and receiver must be different family members.');
  }

  // Verify both members belong to household
  const [payer, receiver] = await Promise.all([
    prisma.householdMember.findUnique({
      where: { id: data.payerMemberId },
      include: { user: true },
    }),
    prisma.householdMember.findUnique({
      where: { id: data.receiverMemberId },
      include: { user: true },
    }),
  ]);

  if (!payer || payer.householdId !== householdId) {
    throw new Error('Paying member does not belong to this household.');
  }
  if (!receiver || receiver.householdId !== householdId) {
    throw new Error('Receiving member does not belong to this household.');
  }

  // Prevent Over-Settlement check
  const balances = await getHouseholdBalances(householdId);
  const payerBalance = balances.members.find((m) => m.memberId === data.payerMemberId);

  if (payerBalance) {
    if (payerBalance.netBalance >= 0) {
      throw new Error(
        `${payerBalance.name} currently has no outstanding debt in this household (Balance: ₹${payerBalance.netBalance.toFixed(2)}). Advance settlements are not permitted.`
      );
    }
    const maxDebt = Math.abs(payerBalance.netBalance);
    if (cleanAmount > maxDebt + 0.01) {
      throw new Error(
        `Settlement amount ₹${cleanAmount.toFixed(2)} exceeds ${payerBalance.name}'s total outstanding debt of ₹${maxDebt.toFixed(2)}. Over-settlement is not permitted.`
      );
    }
  }

  const settlementDate = data.date ? new Date(data.date) : new Date();

  return await prisma.householdSettlement.create({
    data: {
      householdId,
      payerMemberId: data.payerMemberId,
      receiverMemberId: data.receiverMemberId,
      amount: cleanAmount,
      date: settlementDate,
      paymentMethod: data.paymentMethod || PaymentMethod.UPI,
      notes: data.notes?.trim() || null,
    },
    include: {
      payerMember: { include: { user: { select: { name: true } } } },
      receiverMember: { include: { user: { select: { name: true } } } },
    },
  });
}

/**
 * Deletes a recorded settlement.
 */
export async function deleteHouseholdSettlement(householdId: string, settlementId: string) {
  const existing = await prisma.householdSettlement.findUnique({
    where: { id: settlementId },
  });

  if (!existing || existing.householdId !== householdId) {
    throw new Error('Settlement record not found in this household.');
  }

  return await prisma.householdSettlement.delete({
    where: { id: settlementId },
  });
}

// ============================================================================
// MODULE 3: REPORTS, DASHBOARD & EXPORT GENERATION
// ============================================================================

/**
 * Generates all 8 comprehensive reports for the household with correct financial principles.
 * Principles:
 * - Consumption expenses = original transactions where type == 'EXPENSE' (counted ONCE).
 * - Member allocations are shares, not additional expenses.
 * - Repayments between members are settlements, not consumption expenses.
 */
export async function getHouseholdReports(householdId: string, params: ReportFilterParams = {}) {
  const household = await prisma.household.findUnique({ where: { id: householdId } });
  if (!household) throw new Error('Household not found.');

  const now = new Date();
  const currentMonthYear = params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Build where clause for reports
  const txWhere: Prisma.HouseholdTransactionWhereInput = {
    householdId,
  };

  if (params.categoryId) txWhere.categoryId = params.categoryId;
  if (params.subcategory) txWhere.subcategory = params.subcategory;
  if (params.billType) txWhere.billType = params.billType;
  if (params.isShared !== undefined && params.isShared !== 'ALL') {
    txWhere.isShared = Boolean(params.isShared);
  }

  if (params.memberId) {
    txWhere.OR = [
      { paidByMemberId: params.memberId },
      { splits: { some: { memberId: params.memberId } } },
      { contributions: { some: { memberId: params.memberId } } },
    ];
  }

  if (params.startDate || params.endDate) {
    txWhere.date = {};
    if (params.startDate) txWhere.date.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    if (params.endDate) txWhere.date.lte = new Date(`${params.endDate}T23:59:59.999Z`);
  } else if (params.month) {
    const [yStr, mStr] = params.month.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    txWhere.date = {
      gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
      lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  }

  // Fetch transactions and members
  const [allTransactions, members, balancesData, monthlyBudgetRecord] = await Promise.all([
    prisma.householdTransaction.findMany({
      where: txWhere,
      include: {
        category: true,
        splits: {
          include: { member: { include: { user: { select: { name: true } } } } },
        },
        contributions: {
          include: { member: { include: { user: { select: { name: true } } } } },
        },
        paidByMember: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.householdMember.findMany({
      where: { householdId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    getHouseholdBalances(householdId),
    prisma.householdMonthlyBudget.findUnique({
      where: { householdId_monthYear: { householdId, monthYear: currentMonthYear } },
    }),
  ]);

  const monthlyBudget = monthlyBudgetRecord?.amount ?? household.monthlyBudget ?? 0;

  // 1. MONTHLY HOUSEHOLD EXPENSE SUMMARY
  let totalConsumptionExpenses = 0;
  let totalIncome = 0;
  let personalExpenseTotal = 0;
  let sharedExpenseTotal = 0;
  let personalCount = 0;
  let sharedCount = 0;

  const categoryAggregation: Record<string, {
    name: string;
    icon: string;
    color: string;
    amount: number;
    count: number;
    subcategories: Record<string, number>;
  }> = {};

  const billAggregation: Record<string, {
    billType: string;
    label: string;
    icon: string;
    amount: number;
    count: number;
    providers: Record<string, number>;
  }> = {};

  const monthlyTrendMap: Record<string, { month: string; income: number; expense: number; count: number }> = {};

  for (const t of allTransactions) {
    const monthKey = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyTrendMap[monthKey]) {
      monthlyTrendMap[monthKey] = { month: monthKey, income: 0, expense: 0, count: 0 };
    }

    if (t.type === 'INCOME') {
      totalIncome += t.amount;
      monthlyTrendMap[monthKey].income += t.amount;
    } else {
      totalConsumptionExpenses += t.amount;
      monthlyTrendMap[monthKey].expense += t.amount;
      monthlyTrendMap[monthKey].count += 1;

      if (t.isShared) {
        sharedExpenseTotal += t.amount;
        sharedCount += 1;
      } else {
        personalExpenseTotal += t.amount;
        personalCount += 1;
      }

      // Category breakdown
      const catKey = t.categoryName || 'Other Expenses';
      if (!categoryAggregation[catKey]) {
        categoryAggregation[catKey] = {
          name: catKey,
          icon: t.category?.icon || 'Receipt',
          color: t.category?.color || 'slate',
          amount: 0,
          count: 0,
          subcategories: {},
        };
      }
      categoryAggregation[catKey].amount += t.amount;
      categoryAggregation[catKey].count += 1;

      if (t.subcategory) {
        categoryAggregation[catKey].subcategories[t.subcategory] =
          (categoryAggregation[catKey].subcategories[t.subcategory] || 0) + t.amount;
      }

      // Bills & Recharge breakdown
      if (t.billType) {
        const bType = t.billType;
        const bMeta = BILLS_AND_RECHARGE_TYPES.find((b) => b.id === bType);
        const bLabel = bMeta?.label || bType;
        const bIcon = bMeta?.icon || 'Zap';

        if (!billAggregation[bType]) {
          billAggregation[bType] = {
            billType: bType,
            label: bLabel,
            icon: bIcon,
            amount: 0,
            count: 0,
            providers: {},
          };
        }
        billAggregation[bType].amount += t.amount;
        billAggregation[bType].count += 1;

        if (t.billProvider) {
          billAggregation[bType].providers[t.billProvider] =
            (billAggregation[bType].providers[t.billProvider] || 0) + t.amount;
        }
      }
    }
  }

  // Format 1. Monthly Summary KPIs
  const netCashFlow = totalIncome - totalConsumptionExpenses;
  const remainingBudget = Math.max(0, monthlyBudget - totalConsumptionExpenses);
  const budgetUtilization = monthlyBudget > 0 ? (totalConsumptionExpenses / monthlyBudget) * 100 : 0;

  // Format 2. Category Summary
  const categorySummary = Object.values(categoryAggregation)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      amount: Math.round(c.amount * 100) / 100,
      percentage: totalConsumptionExpenses > 0 ? Math.round((c.amount / totalConsumptionExpenses) * 1000) / 10 : 0,
      subcategories: Object.entries(c.subcategories).map(([name, amt]) => ({
        name,
        amount: Math.round(amt * 100) / 100,
      })),
    }));

  // Format 3. Month-wise Spending Trend (sorted chronological)
  const monthlySpendingTrend = Object.values(monthlyTrendMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      income: Math.round(m.income * 100) / 100,
      expense: Math.round(m.expense * 100) / 100,
      net: Math.round((m.income - m.expense) * 100) / 100,
    }));

  // Format 4. Member-Wise Allocated Share & Contribution Summary
  const memberSummary = balancesData.members.map((m) => ({
    memberId: m.memberId,
    name: m.name,
    email: m.email,
    role: m.role,
    totalExpensePaid: m.totalExpensePaid,
    totalShareAllocated: m.totalShareAllocated,
    settlementsPaid: m.settlementsPaid,
    settlementsReceived: m.settlementsReceived,
    netBalance: m.netBalance,
    status: m.status,
  }));

  // Format 5. Personal vs Shared Expense Summary
  const personalVsShared = {
    personal: {
      total: Math.round(personalExpenseTotal * 100) / 100,
      count: personalCount,
      percentage: totalConsumptionExpenses > 0 ? Math.round((personalExpenseTotal / totalConsumptionExpenses) * 1000) / 10 : 0,
    },
    shared: {
      total: Math.round(sharedExpenseTotal * 100) / 100,
      count: sharedCount,
      percentage: totalConsumptionExpenses > 0 ? Math.round((sharedExpenseTotal / totalConsumptionExpenses) * 1000) / 10 : 0,
    },
  };

  // Format 6. Outstanding Balances and Settlements
  const outstandingBalances = {
    memberBalances: balancesData.members,
    suggestedSettlements: balancesData.suggestedSettlements,
    recentSettlements: balancesData.recentSettlements,
  };

  // Format 7. Mobile Recharge & Utility-Bill Summary
  const billsAndRechargeSummary = {
    totalBillExpenses: Math.round(
      Object.values(billAggregation).reduce((sum, b) => sum + b.amount, 0) * 100
    ) / 100,
    breakdown: Object.values(billAggregation)
      .sort((a, b) => b.amount - a.amount)
      .map((b) => ({
        ...b,
        amount: Math.round(b.amount * 100) / 100,
        providers: Object.entries(b.providers).map(([name, amt]) => ({
          provider: name,
          amount: Math.round(amt * 100) / 100,
        })),
      })),
  };

  // Format 8. Custom Date-Range Summary
  const daysCovered = params.startDate && params.endDate
    ? Math.max(1, Math.round((new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 30;

  const customDateRangeReport = {
    periodStart: params.startDate || (allTransactions[0]?.date ? new Date(allTransactions[0].date).toISOString().slice(0, 10) : 'N/A'),
    periodEnd: params.endDate || (allTransactions[allTransactions.length - 1]?.date ? new Date(allTransactions[allTransactions.length - 1].date).toISOString().slice(0, 10) : 'N/A'),
    totalTransactions: allTransactions.length,
    totalExpenses: Math.round(totalConsumptionExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    dailyAverageExpense: Math.round((totalConsumptionExpenses / daysCovered) * 100) / 100,
  };

  return {
    household: {
      id: household.id,
      name: household.name,
      currency: household.currency || 'INR',
    },
    filterParams: params,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalConsumptionExpenses: Math.round(totalConsumptionExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      monthlyBudget: Math.round(monthlyBudget * 100) / 100,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
      budgetUtilization: Math.round(budgetUtilization * 10) / 10,
    },
    reports: {
      monthlyExpenseSummary: {
        totalConsumptionExpenses: Math.round(totalConsumptionExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        monthlyBudget: Math.round(monthlyBudget * 100) / 100,
        remainingBudget: Math.round(remainingBudget * 100) / 100,
        budgetUtilization: Math.round(budgetUtilization * 10) / 10,
      },
      categoryWiseSummary: categorySummary,
      monthlySpendingTrend,
      memberWiseSummary: memberSummary,
      personalVsSharedSummary: personalVsShared,
      outstandingBalancesAndSettlements: outstandingBalances,
      billsAndRechargeSummary,
      customDateRangeReport,
    },
  };
}

/**
 * Calculates dashboard statistics for a given month.
 */
export async function getHouseholdDashboard(householdId: string, monthYearParam?: string) {
  const now = new Date();
  const currentMonthYear = monthYearParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = currentMonthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const prevMonthStart = new Date(Date.UTC(year, month - 2, 1, 0, 0, 0));
  const prevMonthEnd = new Date(Date.UTC(year, month - 1, 0, 23, 59, 59, 999));

  const [household, budgetRecord, currentMonthTransactions, prevMonthTransactions, balances] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    prisma.householdMonthlyBudget.findUnique({
      where: { householdId_monthYear: { householdId, monthYear: currentMonthYear } },
    }),
    prisma.householdTransaction.findMany({
      where: { householdId, date: { gte: startOfMonth, lte: endOfMonth } },
      include: {
        category: true,
        createdBy: { select: { id: true, name: true, email: true } },
        splits: { include: { member: { include: { user: { select: { name: true } } } } } },
        contributions: { include: { member: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.householdTransaction.findMany({
      where: { householdId, date: { gte: prevMonthStart, lte: prevMonthEnd } },
    }),
    getHouseholdBalances(householdId),
  ]);

  if (!household) throw new Error('Household not found.');

  const monthlyBudget = budgetRecord?.amount ?? household.monthlyBudget ?? 0;

  let totalIncome = 0;
  let totalExpenses = 0;
  let sharedExpensesTotal = 0;
  const categoryTotals: Record<string, { name: string; amount: number; count: number; icon?: string; color?: string }> = {};

  for (const t of currentMonthTransactions) {
    if (t.type === 'INCOME') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
      if (t.isShared) sharedExpensesTotal += t.amount;

      const catKey = t.categoryName || 'Other Expenses';
      if (!categoryTotals[catKey]) {
        categoryTotals[catKey] = {
          name: catKey,
          amount: 0,
          count: 0,
          icon: t.category?.icon || 'Receipt',
          color: t.category?.color || 'slate',
        };
      }
      categoryTotals[catKey].amount += t.amount;
      categoryTotals[catKey].count += 1;
    }
  }

  let prevIncome = 0;
  let prevExpenses = 0;
  for (const pt of prevMonthTransactions) {
    if (pt.type === 'INCOME') prevIncome += pt.amount;
    else prevExpenses += pt.amount;
  }

  const expenseChangePercent = prevExpenses > 0
    ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100)
    : 0;
  const incomeChangePercent = prevIncome > 0
    ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100)
    : 0;

  const netCashFlow = totalIncome - totalExpenses;
  const remainingBudget = Math.max(0, monthlyBudget - totalExpenses);
  const budgetUtilization = monthlyBudget > 0 ? Math.min(100, (totalExpenses / monthlyBudget) * 100) : 0;
  const isBudgetExceeded = monthlyBudget > 0 && totalExpenses > monthlyBudget;

  const categoryBreakdown = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      percent: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0,
    }));

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyTrend: { day: number; dateStr: string; income: number; expense: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dailyTrend.push({
      day: d,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      income: 0,
      expense: 0,
    });
  }

  for (const t of currentMonthTransactions) {
    const tDay = new Date(t.date).getUTCDate();
    if (tDay >= 1 && tDay <= daysInMonth) {
      if (t.type === 'INCOME') dailyTrend[tDay - 1].income += t.amount;
      else dailyTrend[tDay - 1].expense += t.amount;
    }
  }

  return {
    monthYear: currentMonthYear,
    currency: household.currency || 'INR',
    kpis: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      sharedExpensesTotal: Math.round(sharedExpensesTotal * 100) / 100,
      netCashFlow: Math.round(netCashFlow * 100) / 100,
      monthlyBudget: Math.round(monthlyBudget * 100) / 100,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
      budgetUtilization: Math.round(budgetUtilization * 10) / 10,
      isBudgetExceeded,
      previousMonth: {
        totalIncome: prevIncome,
        totalExpenses: prevExpenses,
        expenseChangePercent,
        incomeChangePercent,
      },
    },
    balancesSummary: {
      members: balances.members,
      suggestedSettlements: balances.suggestedSettlements,
    },
    categoryBreakdown,
    dailyTrend,
    recentTransactions: currentMonthTransactions.slice(0, 10).map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      categoryName: t.categoryName,
      categoryIcon: t.category?.icon || 'Receipt',
      categoryColor: t.category?.color || 'slate',
      subcategory: t.subcategory,
      date: t.date,
      paymentMethod: t.paymentMethod,
      description: t.description,
      payeeMerchant: t.payeeMerchant,
      createdByName: t.createdBy.name,
      createdById: t.createdById,
      isShared: t.isShared,
      paidByName: t.paidByName || t.createdBy.name,
    })),
  };
}

// ============================================================================
// MEMBERS & INVITATIONS
// ============================================================================

export async function getHouseholdMembers(householdId: string) {
  const members = await prisma.householdMember.findMany({
    where: { householdId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    phone: m.user.phone,
    role: m.role,
    joinedAt: m.createdAt,
  }));
}

export async function updateMemberRole(
  householdId: string,
  operatorId: string,
  targetMemberId: string,
  newRole: HouseholdRole
) {
  const member = await prisma.householdMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!member || member.householdId !== householdId) {
    throw new Error('Member not found in this household.');
  }

  if (member.role === HouseholdRole.OWNER && newRole !== HouseholdRole.OWNER) {
    const ownerCount = await prisma.householdMember.count({
      where: { householdId, role: HouseholdRole.OWNER },
    });
    if (ownerCount <= 1) {
      throw new Error('Cannot demote the sole household Owner. Please transfer ownership first.');
    }
  }

  return await prisma.householdMember.update({
    where: { id: targetMemberId },
    data: { role: newRole },
  });
}

export async function removeMember(
  householdId: string,
  operatorId: string,
  targetMemberId: string
) {
  const member = await prisma.householdMember.findUnique({
    where: { id: targetMemberId },
  });

  if (!member || member.householdId !== householdId) {
    throw new Error('Member not found in this household.');
  }

  if (member.role === HouseholdRole.OWNER) {
    throw new Error('Cannot remove the household Owner.');
  }

  return await prisma.householdMember.delete({
    where: { id: targetMemberId },
  });
}

export async function createHouseholdInvitation(
  householdId: string,
  inviterId: string,
  inviteeEmail: string | undefined,
  role: HouseholdRole = HouseholdRole.MEMBER
) {
  if (role === HouseholdRole.OWNER) {
    throw new Error('Invitations can only grant ADMIN, MEMBER, or VIEWER roles.');
  }

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const invitation = await prisma.householdInvitation.create({
    data: {
      householdId,
      inviterId,
      inviteeEmail: inviteeEmail?.trim().toLowerCase() || null,
      inviteToken: token,
      role,
      status: HouseholdInviteStatus.PENDING,
      expiresAt,
    },
    include: {
      household: { select: { name: true } },
    },
  });

  return {
    id: invitation.id,
    token,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    householdName: invitation.household.name,
    inviteLink: `/ghar-kharcha/join?token=${token}`,
  };
}

export async function getHouseholdInvitations(householdId: string) {
  return await prisma.householdInvitation.findMany({
    where: {
      householdId,
      status: HouseholdInviteStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: {
      inviter: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeHouseholdInvitation(householdId: string, invitationId: string) {
  return await prisma.householdInvitation.updateMany({
    where: {
      id: invitationId,
      householdId,
      status: HouseholdInviteStatus.PENDING,
    },
    data: { status: HouseholdInviteStatus.REVOKED },
  });
}

export async function validateInvitationToken(token: string) {
  const invitation = await prisma.householdInvitation.findUnique({
    where: { inviteToken: token },
    include: {
      household: true,
      inviter: { select: { name: true, email: true } },
    },
  });

  if (!invitation) {
    throw new Error('Invalid or non-existent invitation link.');
  }

  if (invitation.status !== HouseholdInviteStatus.PENDING) {
    throw new Error(`This invitation has already been ${invitation.status.toLowerCase()}.`);
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.householdInvitation.update({
      where: { id: invitation.id },
      data: { status: HouseholdInviteStatus.EXPIRED },
    });
    throw new Error('This invitation link has expired. Please request a new invite.');
  }

  return {
    valid: true,
    householdId: invitation.householdId,
    householdName: invitation.household.name,
    inviterName: invitation.inviter.name,
    role: invitation.role,
  };
}

export async function acceptHouseholdInvitation(userId: string, token: string) {
  const validation = await validateInvitationToken(token);

  return await prisma.$transaction(async (tx) => {
    await tx.householdInvitation.update({
      where: { inviteToken: token },
      data: { status: HouseholdInviteStatus.ACCEPTED },
    });

    const member = await tx.householdMember.upsert({
      where: {
        userId_householdId: {
          userId,
          householdId: validation.householdId,
        },
      },
      update: {
        role: validation.role,
      },
      create: {
        userId,
        householdId: validation.householdId,
        role: validation.role,
      },
    });

    return {
      success: true,
      householdId: validation.householdId,
      householdName: validation.householdName,
      role: member.role,
    };
  });
}

export async function setMonthlyBudget(
  householdId: string,
  monthYear: string,
  amount: number
) {
  const budgetAmount = Math.max(0, Number(amount) || 0);

  return await prisma.householdMonthlyBudget.upsert({
    where: {
      householdId_monthYear: {
        householdId,
        monthYear,
      },
    },
    update: {
      amount: budgetAmount,
    },
    create: {
      householdId,
      monthYear,
      amount: budgetAmount,
    },
  });
}

// ============================================================================
// EXPORT FORMATTERS (CSV, EXCEL-COMPATIBLE XML, HTML PRINT)
// ============================================================================

/**
 * Generates RFC 4180 CSV string of household transactions with full splitting & bills metadata.
 */
export async function exportTransactionsCsv(householdId: string, params: TransactionFilterParams = {}) {
  const { transactions } = await getHouseholdTransactions(householdId, {
    ...params,
    page: 1,
    pageSize: 10000,
  });

  const headers = [
    'Date',
    'Type',
    'Amount (INR)',
    'Category',
    'Subcategory',
    'Description',
    'Paid By',
    'Shared / Personal',
    'Split Type',
    'Member Shares',
    'Bill / Utility Type',
    'Provider',
    'Consumer / Account ID',
    'Bill Period',
    'Payment Method',
    'Payee / Merchant',
    'Recorded By',
    'Notes',
  ];

  const rows = transactions.map((t) => [
    new Date(t.date).toISOString().split('T')[0],
    t.type,
    t.amount.toFixed(2),
    `"${(t.categoryName || '').replace(/"/g, '""')}"`,
    `"${(t.subcategory || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.paidByName || '').replace(/"/g, '""')}"`,
    t.isShared ? 'Shared Expense' : 'Personal Expense',
    t.isShared ? (t.splitType || 'EQUAL') : 'N/A',
    `"${(t.splits.map((s) => `${s.memberName}: ₹${s.allocatedAmount.toFixed(2)}`).join('; ') || '').replace(/"/g, '""')}"`,
    `"${(t.billType || '').replace(/"/g, '""')}"`,
    `"${(t.billProvider || '').replace(/"/g, '""')}"`,
    `"${(t.billConsumerId || '').replace(/"/g, '""')}"`,
    `"${(t.billPeriod || '').replace(/"/g, '""')}"`,
    t.paymentMethod,
    `"${(t.payeeMerchant || '').replace(/"/g, '""')}"`,
    `"${(t.createdByName || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates an Excel-compatible XML Spreadsheet (SpreadsheetML) formatted workbook.
 * Fully compatible with Microsoft Excel, LibreOffice Calc, and Google Sheets without external dependencies.
 */
export async function exportReportsExcelCompatible(householdId: string, params: ReportFilterParams = {}) {
  const reportData = await getHouseholdReports(householdId, params);
  const h = reportData.household;
  const kpis = reportData.kpis;

  const escapeXml = (str: string | number | null | undefined) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  // Build Excel SpreadsheetML XML
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#047857"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="BoldText">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
 </Styles>

 <!-- SHEET 1: EXECUTIVE EXPENSE SUMMARY -->
 <Worksheet ss:Name="Executive Summary">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="200"/>
   <Column ss:Width="150"/>
   <Row>
    <Cell ss:StyleID="HeaderTitle"><Data ss:Type="String">PakkaChittha Mera Ghar — Financial Report</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Household: ${escapeXml(h.name)}</Data></Cell>
    <Cell><Data ss:Type="String">Currency: INR (₹)</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Generated: ${escapeXml(new Date().toLocaleDateString('en-IN'))}</Data></Cell>
   </Row>
   <Row></Row>

   <Row>
    <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">Financial Metric</Data></Cell>
    <Cell ss:StyleID="SectionHeader"><Data ss:Type="String">Amount (INR)</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Consumption Expenses</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${kpis.totalConsumptionExpenses}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Household Income</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${kpis.totalIncome}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Net Cash Flow (Savings)</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${kpis.netCashFlow}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Monthly Budget</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${kpis.monthlyBudget}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Remaining Monthly Budget</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${kpis.remainingBudget}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Budget Utilization %</Data></Cell>
    <Cell><Data ss:Type="String">${kpis.budgetUtilization}%</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- SHEET 2: CATEGORY BREAKDOWN -->
 <Worksheet ss:Name="Category Summary">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="180"/>
   <Column ss:Width="130"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Row>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Expense (INR)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Share %</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tx Count</Data></Cell>
   </Row>
   ${reportData.reports.categoryWiseSummary
     .map(
       (c) => `<Row>
    <Cell><Data ss:Type="String">${escapeXml(c.name)}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${c.amount}</Data></Cell>
    <Cell><Data ss:Type="String">${c.percentage}%</Data></Cell>
    <Cell><Data ss:Type="Number">${c.count}</Data></Cell>
   </Row>`
     )
     .join('\n   ')}
  </Table>
 </Worksheet>

 <!-- SHEET 3: FAMILY MEMBER SHARES & SETTLEMENTS -->
 <Worksheet ss:Name="Member Balances">
  <Table ss:DefaultColumnWidth="150">
   <Column ss:Width="160"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Row>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Family Member</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Expenses Paid</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Allocated Share</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Settlements Paid</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Settlements Recv</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Net Balance</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
   </Row>
   ${reportData.reports.memberWiseSummary
     .map(
       (m) => `<Row>
    <Cell><Data ss:Type="String">${escapeXml(m.name)}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${m.totalExpensePaid}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${m.totalShareAllocated}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${m.settlementsPaid}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${m.settlementsReceived}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${m.netBalance}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(m.status)}</Data></Cell>
   </Row>`
     )
     .join('\n   ')}
  </Table>
 </Worksheet>

 <!-- SHEET 4: BILLS & UTILITY RECHARGES -->
 <Worksheet ss:Name="Bills and Recharge">
  <Table ss:DefaultColumnWidth="160">
   <Row>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Bill / Recharge Type</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Amount (INR)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Count</Data></Cell>
   </Row>
   ${reportData.reports.billsAndRechargeSummary.breakdown
     .map(
       (b) => `<Row>
    <Cell><Data ss:Type="String">${escapeXml(b.label)}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${b.amount}</Data></Cell>
    <Cell><Data ss:Type="Number">${b.count}</Data></Cell>
   </Row>`
     )
     .join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;
}

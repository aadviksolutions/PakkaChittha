import prisma from '@/lib/prisma';
import crypto from 'crypto';
import {
  HouseholdRole,
  HouseholdTransactionType,
  PaymentMethod,
  HouseholdInviteStatus,
  Prisma,
} from '@prisma/client';
import { ALL_DEFAULT_CATEGORIES } from './defaultCategories';

export interface CreateHouseholdInput {
  name: string;
  currency?: string;
  monthlyBudget?: number;
  budgetStartDay?: number;
}

export interface TransactionFilterParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  type?: HouseholdTransactionType;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTransactionInput {
  type: HouseholdTransactionType;
  amount: number;
  categoryId?: string | null;
  categoryName?: string;
  date?: string | Date;
  paymentMethod?: PaymentMethod;
  description?: string | null;
  payeeMerchant?: string | null;
  notes?: string | null;
}

/**
 * Creates a new household, marks creator as OWNER, and seeds default categories.
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
    }));

    await tx.householdCategory.createMany({
      data: categoryData,
      skipDuplicates: true,
    });

    // 4. If monthly budget specified, record current month budget
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

/**
 * Calculates dashboard statistics for a given month.
 */
export async function getHouseholdDashboard(householdId: string, monthYearParam?: string) {
  const now = new Date();
  const currentMonthYear = monthYearParam || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = currentMonthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Month date boundaries
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Previous month date boundaries for trend comparisons
  const prevMonthStart = new Date(Date.UTC(year, month - 2, 1, 0, 0, 0));
  const prevMonthEnd = new Date(Date.UTC(year, month - 1, 0, 23, 59, 59, 999));

  // 1. Get Household & active budget
  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });
  if (!household) throw new Error('Household not found.');

  const budgetRecord = await prisma.householdMonthlyBudget.findUnique({
    where: {
      householdId_monthYear: {
        householdId,
        monthYear: currentMonthYear,
      },
    },
  });

  const monthlyBudget = budgetRecord?.amount ?? household.monthlyBudget ?? 0;

  // 2. Aggregate current month transactions
  const currentMonthTransactions = await prisma.householdTransaction.findMany({
    where: {
      householdId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: {
      category: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals: Record<string, { name: string; amount: number; count: number; icon?: string; color?: string }> = {};

  for (const t of currentMonthTransactions) {
    if (t.type === 'INCOME') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
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

  // 3. Aggregate previous month for comparisons
  const prevMonthTransactions = await prisma.householdTransaction.findMany({
    where: {
      householdId,
      date: {
        gte: prevMonthStart,
        lte: prevMonthEnd,
      },
    },
  });

  let prevIncome = 0;
  let prevExpenses = 0;
  for (const pt of prevMonthTransactions) {
    if (pt.type === 'INCOME') prevIncome += pt.amount;
    else prevExpenses += pt.amount;
  }

  // Percentage changes
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

  // Category breakdown sorted by highest expense
  const categoryBreakdown = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      percent: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0,
    }));

  // Daily trend calculation
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
    categoryBreakdown,
    dailyTrend,
    recentTransactions: currentMonthTransactions.slice(0, 10).map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      categoryName: t.categoryName,
      categoryIcon: t.category?.icon || 'Receipt',
      categoryColor: t.category?.color || 'slate',
      date: t.date,
      paymentMethod: t.paymentMethod,
      description: t.description,
      payeeMerchant: t.payeeMerchant,
      createdByName: t.createdBy.name,
      createdById: t.createdById,
    })),
  };
}

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

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) {
      where.date.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    }
    if (params.endDate) {
      where.date.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { description: { contains: term, mode: 'insensitive' } },
      { payeeMerchant: { contains: term, mode: 'insensitive' } },
      { categoryName: { contains: term, mode: 'insensitive' } },
      { notes: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [totalCount, transactions] = await Promise.all([
    prisma.householdTransaction.count({ where }),
    prisma.householdTransaction.findMany({
      where,
      include: {
        category: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
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
      date: t.date,
      paymentMethod: t.paymentMethod,
      description: t.description,
      payeeMerchant: t.payeeMerchant,
      notes: t.notes,
      createdById: t.createdById,
      createdByName: t.createdBy.name,
      createdAt: t.createdAt,
    })),
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Creates a new household income or expense transaction.
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

  // Resolve category
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

  const txDate = data.date ? new Date(data.date) : new Date();

  return await prisma.householdTransaction.create({
    data: {
      householdId,
      createdById: userId,
      type: data.type,
      amount: Math.round(amount * 100) / 100, // Safe decimal rounding
      categoryId,
      categoryName,
      date: txDate,
      paymentMethod: data.paymentMethod || PaymentMethod.CASH,
      description: data.description?.trim() || null,
      payeeMerchant: data.payeeMerchant?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
}

/**
 * Updates an existing transaction with permission checks.
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
  });

  if (!existing || existing.householdId !== householdId) {
    throw new Error('Transaction record not found in this household.');
  }

  // Permissions: OWNER and ADMIN can edit any; MEMBER can edit own; VIEWER cannot edit
  if (userRole === HouseholdRole.VIEWER) {
    throw new Error('Viewers have read-only access and cannot edit transactions.');
  }
  if (userRole === HouseholdRole.MEMBER && existing.createdById !== userId) {
    throw new Error('Members may only edit transactions they recorded.');
  }

  const updateData: Prisma.HouseholdTransactionUpdateInput = {};

  if (data.amount !== undefined) {
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
      throw new Error('Please enter a valid positive monetary amount.');
    }
    updateData.amount = Math.round(amount * 100) / 100;
  }

  if (data.type) {
    if (!['INCOME', 'EXPENSE'].includes(data.type)) {
      throw new Error('Invalid transaction type.');
    }
    updateData.type = data.type;
  }

  if (data.categoryId !== undefined) {
    if (data.categoryId) {
      const cat = await prisma.householdCategory.findUnique({
        where: { id: data.categoryId },
      });
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

  return await prisma.householdTransaction.update({
    where: { id: transactionId },
    data: updateData,
  });
}

/**
 * Deletes a transaction with permission checks.
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

/**
 * Retrieves categories for a household (including defaults).
 */
export async function getHouseholdCategories(householdId: string) {
  return await prisma.householdCategory.findMany({
    where: {
      OR: [
        { householdId },
        { householdId: null },
      ],
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Creates a custom category.
 */
export async function createHouseholdCategory(
  householdId: string,
  data: { name: string; type: HouseholdTransactionType; icon?: string; color?: string; monthlyBudget?: number }
) {
  const trimmedName = data.name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error('Category name must be at least 2 characters.');
  }

  return await prisma.householdCategory.create({
    data: {
      householdId,
      name: trimmedName,
      type: data.type,
      icon: data.icon || 'Tag',
      color: data.color || 'slate',
      monthlyBudget: data.monthlyBudget ? Math.max(0, Number(data.monthlyBudget)) : null,
      isDefault: false,
    },
  });
}

/**
 * Updates a custom category.
 */
export async function updateHouseholdCategory(
  householdId: string,
  categoryId: string,
  data: { name?: string; icon?: string; color?: string; monthlyBudget?: number | null }
) {
  const category = await prisma.householdCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category || category.householdId !== householdId) {
    throw new Error('Category not found or cannot be modified.');
  }

  return await prisma.householdCategory.update({
    where: { id: categoryId },
    data: {
      name: data.name ? data.name.trim() : undefined,
      icon: data.icon || undefined,
      color: data.color || undefined,
      monthlyBudget: data.monthlyBudget !== undefined ? data.monthlyBudget : undefined,
    },
  });
}

/**
 * Deletes a custom category safely.
 */
export async function deleteHouseholdCategory(householdId: string, categoryId: string) {
  const category = await prisma.householdCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category || category.householdId !== householdId) {
    throw new Error('Category not found or cannot be deleted.');
  }

  return await prisma.householdCategory.delete({
    where: { id: categoryId },
  });
}

/**
 * Retrieves all members of a household.
 */
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

/**
 * Updates a member's role (OWNER only).
 */
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

  // Prevent demoting the owner directly without ownership transfer
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

/**
 * Removes a member from a household (OWNER or ADMIN).
 */
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

/**
 * Generates an expiring, single-use invitation token for a family member.
 */
export async function createHouseholdInvitation(
  householdId: string,
  inviterId: string,
  inviteeEmail: string | undefined,
  role: HouseholdRole = HouseholdRole.MEMBER
) {
  // Prevent inviting as OWNER
  if (role === HouseholdRole.OWNER) {
    throw new Error('Invitations can only grant ADMIN, MEMBER, or VIEWER roles.');
  }

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours validity

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

/**
 * Retrieves pending invitations for a household.
 */
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

/**
 * Revokes a pending invitation.
 */
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

/**
 * Validates an invitation token for redemption.
 */
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

/**
 * Accepts an invitation and links the authenticated user to the household.
 */
export async function acceptHouseholdInvitation(userId: string, token: string) {
  const validation = await validateInvitationToken(token);

  return await prisma.$transaction(async (tx) => {
    // 1. Mark invite accepted
    await tx.householdInvitation.update({
      where: { inviteToken: token },
      data: { status: HouseholdInviteStatus.ACCEPTED },
    });

    // 2. Link member (upsert to be idempotent)
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

/**
 * Sets or updates monthly budget for a specific month.
 */
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

/**
 * Generates RFC 4180 CSV string of household transactions.
 */
export async function exportTransactionsCsv(householdId: string, params: TransactionFilterParams = {}) {
  const { transactions } = await getHouseholdTransactions(householdId, {
    ...params,
    page: 1,
    pageSize: 10000, // Export all matching
  });

  const headers = ['Date', 'Type', 'Amount (INR)', 'Category', 'Description', 'Payee / Merchant', 'Payment Method', 'Recorded By', 'Notes'];

  const rows = transactions.map((t) => [
    new Date(t.date).toISOString().split('T')[0],
    t.type,
    t.amount.toFixed(2),
    `"${(t.categoryName || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.payeeMerchant || '').replace(/"/g, '""')}"`,
    t.paymentMethod,
    `"${(t.createdByName || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

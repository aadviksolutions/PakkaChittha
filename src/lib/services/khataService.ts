import prisma from '@/lib/prisma';
import { Prisma, KhataEntryStatus, PaymentMethod } from '@prisma/client';

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface CreateKhataContactInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface CreateKhataTransactionInput {
  contactId?: string;
  personName?: string;
  phone?: string | null;
  type: 'GAVE' | 'RECEIVED';
  amount: number;
  date?: string | Date;
  dueDate?: string | Date | null;
  description?: string | null;
}

export interface RecordKhataRepaymentInput {
  transactionId: string;
  amount: number;
  date?: string | Date;
  paymentMode?: PaymentMethod;
  notes?: string | null;
}

/**
 * Standardizes a phone number to 10 digits for Indian format or clean digits
 */
export function cleanPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Formats a date nicely for human display
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats INR currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Retrieves the complete Khata Dashboard metrics for a tenant workspace:
 * - Total I Gave (Original amount given)
 * - Total I Received (Original amount received)
 * - Money I Have to Collect (Outstanding on I Gave entries)
 * - Money I Have to Repay (Outstanding on I Received entries)
 * - Recent transactions
 * - Overdue entries
 * - Person-wise contacts summary
 */
export async function getKhataDashboardSummary(businessId: string) {
  const [contacts, transactions] = await Promise.all([
    prisma.khataContact.findMany({
      where: { businessId },
      include: {
        transactions: {
          include: {
            repayments: {
              orderBy: { date: 'desc' },
            },
          },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.khataTransaction.findMany({
      where: { businessId },
      include: {
        contact: true,
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ]);

  // Aggregate metrics across all contacts
  let totalGave = 0;
  let totalReceived = 0;
  let moneyToCollect = 0;
  let moneyToRepay = 0;
  const now = new Date();

  // Contact summaries
  const contactSummaries = contacts.map((c) => {
    let personGave = 0;
    let personReceived = 0;
    let personGaveOutstanding = 0;
    let personReceivedOutstanding = 0;

    for (const tx of c.transactions) {
      if (tx.type === 'GAVE') {
        personGave += tx.amount;
        personGaveOutstanding += tx.balanceAmount;
      } else {
        personReceived += tx.amount;
        personReceivedOutstanding += tx.balanceAmount;
      }
    }

    totalGave += personGave;
    totalReceived += personReceived;
    moneyToCollect += personGaveOutstanding;
    moneyToRepay += personReceivedOutstanding;

    // Net balance: positive means person owes user (You will get), negative means user owes person (You will give)
    const netBalance = round2(personGaveOutstanding - personReceivedOutstanding);

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      totalGave: round2(personGave),
      totalReceived: round2(personReceived),
      gaveOutstanding: round2(personGaveOutstanding),
      receivedOutstanding: round2(personReceivedOutstanding),
      netBalance, // > 0: You'll get; < 0: You'll give; 0: settled
      transactionCount: c.transactions.length,
      lastActivityDate: c.transactions[0]?.date || c.createdAt,
      createdAt: c.createdAt,
    };
  });

  // Overdue entries: Transactions where dueDate < now and balanceAmount > 0
  const overdueTransactions = await prisma.khataTransaction.findMany({
    where: {
      businessId,
      dueDate: { lt: now },
      balanceAmount: { gt: 0 },
    },
    include: {
      contact: true,
      repayments: {
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  return {
    kpis: {
      totalGave: round2(totalGave),
      totalReceived: round2(totalReceived),
      moneyToCollect: round2(moneyToCollect),
      moneyToRepay: round2(moneyToRepay),
      netPosition: round2(moneyToCollect - moneyToRepay),
      totalContacts: contacts.length,
      overdueCount: overdueTransactions.length,
    },
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      contactId: t.contactId,
      contactName: t.contact.name,
      contactPhone: t.contact.phone,
      type: t.type,
      amount: round2(t.amount),
      settledAmount: round2(t.settledAmount),
      balanceAmount: round2(t.balanceAmount),
      date: t.date,
      dueDate: t.dueDate,
      description: t.description,
      status: t.status,
      repayments: t.repayments.map((r) => ({
        id: r.id,
        amount: round2(r.amount),
        date: r.date,
        paymentMode: r.paymentMode,
        notes: r.notes,
      })),
      createdAt: t.createdAt,
    })),
    overdueEntries: overdueTransactions.map((t) => ({
      id: t.id,
      contactId: t.contactId,
      contactName: t.contact.name,
      contactPhone: t.contact.phone,
      type: t.type,
      amount: round2(t.amount),
      balanceAmount: round2(t.balanceAmount),
      date: t.date,
      dueDate: t.dueDate,
      description: t.description,
      daysOverdue: Math.max(
        0,
        Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24))
      ),
    })),
    contacts: contactSummaries,
  };
}

/**
 * Retrieves all people / contacts with search and balance details
 */
export async function getKhataContacts(businessId: string, search?: string) {
  const where: Prisma.KhataContactWhereInput = { businessId };
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const contacts = await prisma.khataContact.findMany({
    where,
    include: {
      transactions: {
        include: {
          repayments: true,
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return contacts.map((c) => {
    let totalGave = 0;
    let totalReceived = 0;
    let gaveOutstanding = 0;
    let receivedOutstanding = 0;

    for (const tx of c.transactions) {
      if (tx.type === 'GAVE') {
        totalGave += tx.amount;
        gaveOutstanding += tx.balanceAmount;
      } else {
        totalReceived += tx.amount;
        receivedOutstanding += tx.balanceAmount;
      }
    }

    const netBalance = round2(gaveOutstanding - receivedOutstanding);

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      totalGave: round2(totalGave),
      totalReceived: round2(totalReceived),
      gaveOutstanding: round2(gaveOutstanding),
      receivedOutstanding: round2(receivedOutstanding),
      netBalance,
      transactionCount: c.transactions.length,
      lastActivityDate: c.transactions[0]?.date || c.createdAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });
}

/**
 * Retrieves detailed person ledger with all transactions and repayments
 */
export async function getKhataContactDetail(businessId: string, contactId: string) {
  const contact = await prisma.khataContact.findFirst({
    where: { id: contactId, businessId },
    include: {
      transactions: {
        include: {
          repayments: {
            orderBy: { date: 'desc' },
          },
        },
        orderBy: { date: 'desc' },
      },
      repayments: {
        include: {
          transaction: true,
        },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!contact) {
    throw new Error('Contact not found or access denied.');
  }

  let totalGave = 0;
  let totalReceived = 0;
  let gaveOutstanding = 0;
  let receivedOutstanding = 0;

  for (const tx of contact.transactions) {
    if (tx.type === 'GAVE') {
      totalGave += tx.amount;
      gaveOutstanding += tx.balanceAmount;
    } else {
      totalReceived += tx.amount;
      receivedOutstanding += tx.balanceAmount;
    }
  }

  const netBalance = round2(gaveOutstanding - receivedOutstanding);

  // Build unified chronological activity ledger
  const activityLedger: Array<{
    id: string;
    date: Date;
    activityType: 'TRANSACTION_GAVE' | 'TRANSACTION_RECEIVED' | 'REPAYMENT';
    title: string;
    amount: number;
    balanceAfter?: number;
    paymentMode?: PaymentMethod;
    notes?: string | null;
    dueDate?: Date | null;
    status?: KhataEntryStatus;
    transactionId?: string;
  }> = [];

  for (const tx of contact.transactions) {
    activityLedger.push({
      id: tx.id,
      date: tx.date,
      activityType: tx.type === 'GAVE' ? 'TRANSACTION_GAVE' : 'TRANSACTION_RECEIVED',
      title: tx.type === 'GAVE' ? 'I Gave (Maine Diye)' : 'I Received (Maine Liye)',
      amount: round2(tx.amount),
      balanceAfter: round2(tx.balanceAmount),
      dueDate: tx.dueDate,
      notes: tx.description,
      status: tx.status,
      transactionId: tx.id,
    });
  }

  for (const r of contact.repayments) {
    activityLedger.push({
      id: r.id,
      date: r.date,
      activityType: 'REPAYMENT',
      title: r.transaction.type === 'GAVE' ? 'Payment Received / Returned' : 'Repayment Made',
      amount: round2(r.amount),
      paymentMode: r.paymentMode,
      notes: r.notes,
      transactionId: r.transactionId,
    });
  }

  // Sort unified ledger by date descending
  activityLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    },
    summary: {
      totalGave: round2(totalGave),
      totalReceived: round2(totalReceived),
      gaveOutstanding: round2(gaveOutstanding),
      receivedOutstanding: round2(receivedOutstanding),
      netBalance, // > 0: You'll get; < 0: You'll give; 0: Settled
    },
    transactions: contact.transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: round2(tx.amount),
      settledAmount: round2(tx.settledAmount),
      balanceAmount: round2(tx.balanceAmount),
      date: tx.date,
      dueDate: tx.dueDate,
      description: tx.description,
      status: tx.status,
      repayments: tx.repayments.map((r) => ({
        id: r.id,
        amount: round2(r.amount),
        date: r.date,
        paymentMode: r.paymentMode,
        notes: r.notes,
      })),
      createdAt: tx.createdAt,
    })),
    activityLedger,
  };
}

/**
 * Creates a new Khata contact
 */
export async function createKhataContact(
  businessId: string,
  userId: string,
  input: CreateKhataContactInput
) {
  const trimmedName = input.name?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("Person's name must be at least 2 characters.");
  }

  const rawPhone = input.phone?.trim() || null;

  return prisma.khataContact.create({
    data: {
      businessId,
      userId,
      name: trimmedName,
      phone: rawPhone,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}

/**
 * Creates a new "I Gave" or "I Received" entry
 */
export async function createKhataTransaction(
  businessId: string,
  userId: string,
  input: CreateKhataTransactionInput
) {
  if (input.type !== 'GAVE' && input.type !== 'RECEIVED') {
    throw new Error('Transaction type must be either "GAVE" or "RECEIVED".');
  }

  const numAmount = Number(input.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Amount must be a positive number greater than 0.');
  }

  const roundedAmount = round2(numAmount);
  let contactId = input.contactId;

  // If contactId is not given, find or create the contact by name/phone
  if (!contactId) {
    const personName = input.personName?.trim();
    if (!personName || personName.length < 2) {
      throw new Error('Please select an existing person or enter their name.');
    }

    const rawPhone = input.phone?.trim() || null;

    // Check if a contact with matching name or phone exists
    let existingContact = await prisma.khataContact.findFirst({
      where: {
        businessId,
        OR: [
          { name: { equals: personName, mode: 'insensitive' } },
          ...(rawPhone ? [{ phone: rawPhone }] : []),
        ],
      },
    });

    if (!existingContact) {
      existingContact = await prisma.khataContact.create({
        data: {
          businessId,
          userId,
          name: personName,
          phone: rawPhone,
        },
      });
    }
    contactId = existingContact.id;
  } else {
    // Verify contact belongs to business
    const contact = await prisma.khataContact.findFirst({
      where: { id: contactId, businessId },
    });
    if (!contact) {
      throw new Error('Contact not found or access denied.');
    }

    // If new phone was passed, update contact phone if not already set
    if (input.phone && !contact.phone) {
      await prisma.khataContact.update({
        where: { id: contactId },
        data: { phone: input.phone.trim() },
      });
    }
  }

  const txDate = input.date ? new Date(input.date) : new Date();
  const txDueDate = input.dueDate ? new Date(input.dueDate) : null;

  const transaction = await prisma.khataTransaction.create({
    data: {
      businessId,
      userId,
      contactId,
      type: input.type,
      amount: roundedAmount,
      date: txDate,
      dueDate: txDueDate,
      description: input.description?.trim() || null,
      status: 'PENDING',
      settledAmount: 0,
      balanceAmount: roundedAmount,
    },
    include: {
      contact: true,
    },
  });

  // Touch contact updatedAt
  await prisma.khataContact.update({
    where: { id: contactId },
    data: { updatedAt: new Date() },
  });

  return transaction;
}

/**
 * Updates an existing transaction (e.g. note, date, dueDate, or amount)
 */
export async function updateKhataTransaction(
  businessId: string,
  transactionId: string,
  input: {
    amount?: number;
    date?: string | Date;
    dueDate?: string | Date | null;
    description?: string | null;
  }
) {
  const existing = await prisma.khataTransaction.findFirst({
    where: { id: transactionId, businessId },
  });

  if (!existing) {
    throw new Error('Transaction not found or access denied.');
  }

  const dataToUpdate: Prisma.KhataTransactionUpdateInput = {};

  if (input.description !== undefined) {
    dataToUpdate.description = input.description?.trim() || null;
  }
  if (input.date) {
    dataToUpdate.date = new Date(input.date);
  }
  if (input.dueDate !== undefined) {
    dataToUpdate.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }

  if (input.amount !== undefined) {
    const numAmount = Number(input.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Amount must be a positive number greater than 0.');
    }
    const newAmount = round2(numAmount);

    if (newAmount < existing.settledAmount) {
      throw new Error(
        `Cannot reduce transaction amount to ₹${newAmount} because ₹${existing.settledAmount} has already been repaid.`
      );
    }

    const newBalance = round2(newAmount - existing.settledAmount);
    dataToUpdate.amount = newAmount;
    dataToUpdate.balanceAmount = newBalance;
    dataToUpdate.status =
      newBalance === 0 ? 'SETTLED' : existing.settledAmount > 0 ? 'PARTIAL' : 'PENDING';
  }

  const updated = await prisma.khataTransaction.update({
    where: { id: transactionId },
    data: dataToUpdate,
    include: {
      contact: true,
      repayments: true,
    },
  });

  return updated;
}

/**
 * Records a full or partial repayment towards an outstanding transaction.
 * Strictly prevents negative balances by enforcing repaymentAmount <= balanceAmount.
 */
export async function recordKhataRepayment(
  businessId: string,
  userId: string,
  input: RecordKhataRepaymentInput
) {
  const numAmount = Number(input.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Repayment amount must be a positive number greater than 0.');
  }

  const repaymentAmount = round2(numAmount);

  const transaction = await prisma.khataTransaction.findFirst({
    where: { id: input.transactionId, businessId },
    include: { contact: true },
  });

  if (!transaction) {
    throw new Error('Transaction not found or access denied.');
  }

  if (transaction.status === 'SETTLED' || transaction.balanceAmount <= 0) {
    throw new Error('This transaction is already fully settled. No balance remaining.');
  }

  // Prevent negative balance
  if (repaymentAmount > transaction.balanceAmount) {
    throw new Error(
      `Repayment amount (₹${repaymentAmount}) cannot exceed the remaining outstanding balance of ₹${transaction.balanceAmount}.`
    );
  }

  const newSettledAmount = round2(transaction.settledAmount + repaymentAmount);
  const newBalanceAmount = round2(transaction.amount - newSettledAmount);
  const newStatus: KhataEntryStatus = newBalanceAmount === 0 ? 'SETTLED' : 'PARTIAL';
  const repaymentDate = input.date ? new Date(input.date) : new Date();

  const [repayment, updatedTx] = await prisma.$transaction([
    prisma.khataRepayment.create({
      data: {
        businessId,
        userId,
        contactId: transaction.contactId,
        transactionId: transaction.id,
        amount: repaymentAmount,
        date: repaymentDate,
        paymentMode: input.paymentMode || 'CASH',
        notes: input.notes?.trim() || null,
      },
    }),
    prisma.khataTransaction.update({
      where: { id: transaction.id },
      data: {
        settledAmount: newSettledAmount,
        balanceAmount: newBalanceAmount,
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        contact: true,
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
    }),
    prisma.khataContact.update({
      where: { id: transaction.contactId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return {
    repayment,
    transaction: updatedTx,
  };
}

/**
 * Deletes a Khata transaction and its repayments
 */
export async function deleteKhataTransaction(businessId: string, transactionId: string) {
  const tx = await prisma.khataTransaction.findFirst({
    where: { id: transactionId, businessId },
  });

  if (!tx) {
    throw new Error('Transaction not found or access denied.');
  }

  await prisma.khataTransaction.delete({
    where: { id: transactionId },
  });

  return { success: true };
}

/**
 * Deletes a Khata contact and all their transactions
 */
export async function deleteKhataContact(businessId: string, contactId: string) {
  const contact = await prisma.khataContact.findFirst({
    where: { id: contactId, businessId },
  });

  if (!contact) {
    throw new Error('Contact not found or access denied.');
  }

  await prisma.khataContact.delete({
    where: { id: contactId },
  });

  return { success: true };
}

/**
 * Prepares the manual WhatsApp reminder text and generates the wa.me URL.
 * Includes preview, user editing capability, and zero Meta API requirements.
 */
export function prepareWhatsAppReminder(params: {
  contactName: string;
  phone?: string | null;
  amount: number;
  date: Date | string;
  dueDate?: Date | string | null;
  type: 'GAVE' | 'RECEIVED';
  customMessage?: string;
}) {
  const formattedAmount = formatCurrency(params.amount);
  const formattedTxDate = formatDate(params.date);
  const formattedDueDate = params.dueDate ? formatDate(params.dueDate) : null;

  let defaultMessage = '';

  if (params.type === 'GAVE') {
    defaultMessage = `Namaste ${params.contactName} ji,\n\nThis is a friendly reminder regarding the pending amount of ${formattedAmount} given on ${formattedTxDate}${
      formattedDueDate ? ` (Due Date: ${formattedDueDate})` : ''
    }.\n\nPlease arrange for the payment at your earliest convenience.\n\nThank you! 🙏\n- Sent via Pakka Chittha`;
  } else {
    defaultMessage = `Namaste ${params.contactName} ji,\n\nThis message is regarding the balance of ${formattedAmount} borrowed on ${formattedTxDate}${
      formattedDueDate ? ` (Due Date: ${formattedDueDate})` : ''
    }. I am preparing to arrange repayment soon.\n\nThank you! 🙏\n- Sent via Pakka Chittha`;
  }

  const finalMessage = params.customMessage?.trim() || defaultMessage;
  const standardPhone = cleanPhone(params.phone);
  const encodedText = encodeURIComponent(finalMessage);

  const waUrl = standardPhone
    ? `https://wa.me/${standardPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  return {
    recipientName: params.contactName,
    recipientPhone: params.phone || '',
    cleanPhone: standardPhone,
    hasValidPhone: Boolean(standardPhone && standardPhone.length >= 10),
    amount: params.amount,
    date: params.date,
    dueDate: params.dueDate,
    defaultMessage,
    message: finalMessage,
    waUrl,
  };
}

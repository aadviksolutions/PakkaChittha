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
  paymentMode?: PaymentMethod;
  paymentRef?: string | null;
  paymentDetails?: string | null;
}

export interface RecordKhataRepaymentInput {
  transactionId?: string;
  contactId?: string;
  targetType?: 'GAVE' | 'RECEIVED';
  amount: number;
  date?: string | Date;
  paymentMode?: PaymentMethod;
  paymentRef?: string | null;
  paymentDetails?: string | null;
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
 * Retrieves the complete Personal Khata Dashboard metrics for a workspace:
 * - Card 1: कुल लेने वाली रकम (Amount to Receive / Outstanding Receivable)
 * - Card 2: कुल देने वाली रकम (Amount to Pay / Outstanding Payable)
 * - Card 3: मेरी वर्तमान स्थिति (Net Position = Receivable - Payable)
 * - Cumulative Historical Totals: कुल दी गई रकम (totalGiven) & कुल ली गई रकम (totalTaken)
 * - Payment Mode Summaries: Cash, UPI, Bank Transfer, Cheque, Other
 * - Contact List: Contact summaries with individual ledgers
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
      take: 50,
    }),
  ]);

  // Historical cumulative totals
  let totalGiven = 0;
  let totalTaken = 0;
  let totalReceivedBack = 0;
  let totalReturned = 0;

  // Outstanding balances
  let amountToReceive = 0; // Sum of gaveOutstanding
  let amountToPay = 0;     // Sum of receivedOutstanding

  // Payment mode summaries
  const modeStats: Record<
    PaymentMethod,
    { mode: PaymentMethod; label: string; totalGiven: number; totalReceived: number; count: number }
  > = {
    CASH: { mode: 'CASH', label: 'Cash (नकद)', totalGiven: 0, totalReceived: 0, count: 0 },
    UPI: { mode: 'UPI', label: 'UPI', totalGiven: 0, totalReceived: 0, count: 0 },
    BANK_TRANSFER: { mode: 'BANK_TRANSFER', label: 'Bank Transfer (बैंक ट्रांसफर)', totalGiven: 0, totalReceived: 0, count: 0 },
    CHEQUE: { mode: 'CHEQUE', label: 'Cheque (चेक)', totalGiven: 0, totalReceived: 0, count: 0 },
    OTHER: { mode: 'OTHER', label: 'Other (अन्य)', totalGiven: 0, totalReceived: 0, count: 0 },
  };

  const now = new Date();

  // Contact summaries
  const contactSummaries = contacts.map((c) => {
    let personTotalGiven = 0;
    let personTotalTaken = 0;
    let personReceivedBack = 0;
    let personReturned = 0;
    let personGaveOutstanding = 0;
    let personReceivedOutstanding = 0;

    for (const tx of c.transactions) {
      const mode = (tx.paymentMode as PaymentMethod) || 'CASH';
      if (modeStats[mode]) {
        modeStats[mode].count += 1;
      }

      if (tx.type === 'GAVE') {
        personTotalGiven += tx.amount;
        personGaveOutstanding += tx.balanceAmount;
        if (modeStats[mode]) {
          modeStats[mode].totalGiven += tx.amount;
        }

        // Tally repayments received back from this person
        for (const rep of tx.repayments) {
          personReceivedBack += rep.amount;
          const repMode = (rep.paymentMode as PaymentMethod) || 'CASH';
          if (modeStats[repMode]) {
            modeStats[repMode].totalReceived += rep.amount;
            modeStats[repMode].count += 1;
          }
        }
      } else {
        personTotalTaken += tx.amount;
        personReceivedOutstanding += tx.balanceAmount;
        if (modeStats[mode]) {
          modeStats[mode].totalReceived += tx.amount;
        }

        // Tally repayments returned to this person
        for (const rep of tx.repayments) {
          personReturned += rep.amount;
          const repMode = (rep.paymentMode as PaymentMethod) || 'CASH';
          if (modeStats[repMode]) {
            modeStats[repMode].totalGiven += rep.amount;
            modeStats[repMode].count += 1;
          }
        }
      }
    }

    totalGiven += personTotalGiven;
    totalTaken += personTotalTaken;
    totalReceivedBack += personReceivedBack;
    totalReturned += personReturned;
    amountToReceive += personGaveOutstanding;
    amountToPay += personReceivedOutstanding;

    // Person Net position: Positive means user has to receive, negative means user has to pay
    const personNetPosition = round2(personGaveOutstanding - personReceivedOutstanding);

    let status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED' = 'SETTLED';
    let statusLabel = 'हिसाब पूरा';

    if (personGaveOutstanding > 0 && personReceivedOutstanding === 0) {
      status = 'TO_RECEIVE';
      statusLabel = 'मुझे लेने हैं';
    } else if (personReceivedOutstanding > 0 && personGaveOutstanding === 0) {
      status = 'TO_PAY';
      statusLabel = 'मुझे देने हैं';
    } else if (personGaveOutstanding > 0 || personReceivedOutstanding > 0) {
      if (personNetPosition > 0) {
        status = 'TO_RECEIVE';
        statusLabel = 'मुझे लेने हैं';
      } else if (personNetPosition < 0) {
        status = 'TO_PAY';
        statusLabel = 'मुझे देने हैं';
      } else {
        status = 'SETTLED';
        statusLabel = 'हिसाब पूरा';
      }
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      // Cumulative historical totals
      totalGiven: round2(personTotalGiven),
      totalTaken: round2(personTotalTaken),
      totalReceivedBack: round2(personReceivedBack),
      totalReturned: round2(personReturned),
      // Current outstanding balances
      amountToReceive: round2(personGaveOutstanding),
      amountToPay: round2(personReceivedOutstanding),
      // Net position
      netPosition: personNetPosition,
      status,
      statusLabel,
      // Backward compatibility aliases
      gaveOutstanding: round2(personGaveOutstanding),
      receivedOutstanding: round2(personReceivedOutstanding),
      totalGave: round2(personTotalGiven),
      totalReceived: round2(personTotalTaken),
      netBalance: personNetPosition,
      transactionCount: c.transactions.length,
      lastActivityDate: c.transactions[0]?.date || c.createdAt,
      createdAt: c.createdAt,
    };
  });

  const netPosition = round2(amountToReceive - amountToPay);

  let netPositionDescription = 'आपका कुल हिसाब बराबर है।';
  if (netPosition > 0) {
    netPositionDescription = `आपको कुल ₹${netPosition.toLocaleString('en-IN')} अधिक मिलने बाकी हैं।`;
  } else if (netPosition < 0) {
    netPositionDescription = `आपको कुल ₹${Math.abs(netPosition).toLocaleString('en-IN')} अधिक देने बाकी हैं।`;
  }

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
      // 3 Main Dashboard Cards
      amountToReceive: round2(amountToReceive), // Card 1: कुल लेने वाली रकम (Green)
      amountToPay: round2(amountToPay),         // Card 2: कुल देने वाली रकम (Red)
      netPosition,                             // Card 3: मेरी वर्तमान स्थिति
      netPositionDescription,
      // Cumulative Historical Totals
      totalGiven: round2(totalGiven),          // कुल दी गई रकम
      totalTaken: round2(totalTaken),          // कुल ली गई रकम
      totalReceivedBack: round2(totalReceivedBack), // कुल वापस मिली रकम
      totalReturned: round2(totalReturned),    // कुल वापस की गई रकम
      // Counts
      totalContacts: contacts.length,
      overdueCount: overdueTransactions.length,
      // Backward compatibility aliases
      moneyToCollect: round2(amountToReceive),
      moneyToRepay: round2(amountToPay),
      totalGave: round2(totalGiven),
      totalReceived: round2(totalTaken),
    },
    modeSummaries: Object.values(modeStats).map((m) => ({
      mode: m.mode,
      label: m.label,
      totalGiven: round2(m.totalGiven),
      totalReceived: round2(m.totalReceived),
      count: m.count,
    })),
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
      paymentMode: (t.paymentMode as PaymentMethod) || 'CASH',
      paymentRef: t.paymentRef,
      paymentDetails: t.paymentDetails,
      status: t.status,
      repayments: t.repayments.map((r) => ({
        id: r.id,
        amount: round2(r.amount),
        date: r.date,
        paymentMode: (r.paymentMode as PaymentMethod) || 'CASH',
        paymentRef: r.paymentRef,
        paymentDetails: r.paymentDetails,
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
    let personTotalGiven = 0;
    let personTotalTaken = 0;
    let personReceivedBack = 0;
    let personReturned = 0;
    let personGaveOutstanding = 0;
    let personReceivedOutstanding = 0;

    for (const tx of c.transactions) {
      if (tx.type === 'GAVE') {
        personTotalGiven += tx.amount;
        personGaveOutstanding += tx.balanceAmount;
        for (const rep of tx.repayments) {
          personReceivedBack += rep.amount;
        }
      } else {
        personTotalTaken += tx.amount;
        personReceivedOutstanding += tx.balanceAmount;
        for (const rep of tx.repayments) {
          personReturned += rep.amount;
        }
      }
    }

    const netPosition = round2(personGaveOutstanding - personReceivedOutstanding);

    let status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED' = 'SETTLED';
    let statusLabel = 'हिसाब पूरा';

    if (personGaveOutstanding > 0 && personReceivedOutstanding === 0) {
      status = 'TO_RECEIVE';
      statusLabel = 'मुझे लेने हैं';
    } else if (personReceivedOutstanding > 0 && personGaveOutstanding === 0) {
      status = 'TO_PAY';
      statusLabel = 'मुझे देने हैं';
    } else if (personGaveOutstanding > 0 || personReceivedOutstanding > 0) {
      if (netPosition > 0) {
        status = 'TO_RECEIVE';
        statusLabel = 'मुझे लेने हैं';
      } else if (netPosition < 0) {
        status = 'TO_PAY';
        statusLabel = 'मुझे देने हैं';
      }
    }

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      totalGiven: round2(personTotalGiven),
      totalTaken: round2(personTotalTaken),
      totalReceivedBack: round2(personReceivedBack),
      totalReturned: round2(personReturned),
      amountToReceive: round2(personGaveOutstanding),
      amountToPay: round2(personReceivedOutstanding),
      netPosition,
      status,
      statusLabel,
      // Backward compatibility aliases
      gaveOutstanding: round2(personGaveOutstanding),
      receivedOutstanding: round2(personReceivedOutstanding),
      totalGave: round2(personTotalGiven),
      totalReceived: round2(personTotalTaken),
      netBalance: netPosition,
      transactionCount: c.transactions.length,
      lastActivityDate: c.transactions[0]?.date || c.createdAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });
}

/**
 * Retrieves detailed person ledger with 6 independent figures and complete history
 */
export interface ChronologicalLedgerEntry {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  date: Date;
  createdAt: Date;
  activityType: 'GAVE_NEW' | 'RECEIVED_NEW' | 'LENT_REPAY' | 'BORROWED_REPAY';
  activityLabel: string;
  title: string;
  moneyDirection: 'OUT' | 'IN';
  balanceBucket: 'TO_RECEIVE' | 'TO_PAY';
  amount: number;
  previousBalance: number;
  updatedBalance: number;
  balanceAfter: number;
  previousToReceive: number;
  updatedToReceive: number;
  previousToPay: number;
  updatedToPay: number;
  previousNetBalance: number;
  updatedNetBalance: number;
  paymentMode: PaymentMethod;
  paymentRef?: string | null;
  paymentDetails?: string | null;
  notes?: string | null;
  dueDate?: Date | null;
  status?: KhataEntryStatus;
  transactionId?: string;
}

export interface ContactChronologicalInput {
  id: string;
  name: string;
  phone: string | null;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    date: Date;
    dueDate: Date | null;
    description: string | null;
    paymentMode: PaymentMethod;
    paymentRef: string | null;
    paymentDetails: string | null;
    status: KhataEntryStatus;
    createdAt: Date;
  }>;
  repayments: Array<{
    id: string;
    transactionId: string;
    amount: number;
    date: Date;
    paymentMode: PaymentMethod;
    paymentRef: string | null;
    paymentDetails: string | null;
    notes: string | null;
    createdAt: Date;
    transaction: {
      type: string;
    };
  }>;
}

/**
 * Builds a deterministic chronological ledger (oldest -> newest) for one contact,
 * tracking independent Receivable and Payable running balances (never auto-offset).
 */
export function buildContactChronologicalLedger(
  contact: ContactChronologicalInput
): ChronologicalLedgerEntry[] {
  type RawEvent = {
    id: string;
    date: Date;
    createdAt: Date;
    eventOrder: number;
    activityType: 'GAVE_NEW' | 'RECEIVED_NEW' | 'LENT_REPAY' | 'BORROWED_REPAY';
    activityLabel: string;
    title: string;
    moneyDirection: 'OUT' | 'IN';
    balanceBucket: 'TO_RECEIVE' | 'TO_PAY';
    amount: number;
    paymentMode: PaymentMethod;
    paymentRef: string | null;
    paymentDetails: string | null;
    notes: string | null;
    dueDate: Date | null;
    status?: KhataEntryStatus;
    transactionId: string;
  };

  const rawEvents: RawEvent[] = [];

  for (const tx of contact.transactions) {
    const mode = (tx.paymentMode as PaymentMethod) || 'CASH';
    if (tx.type === 'GAVE') {
      rawEvents.push({
        id: tx.id,
        date: new Date(tx.date),
        createdAt: new Date(tx.createdAt),
        eventOrder: 0,
        activityType: 'GAVE_NEW',
        activityLabel: 'Given (To Receive)',
        title: 'नई रकम दी (Lent)',
        moneyDirection: 'OUT',
        balanceBucket: 'TO_RECEIVE',
        amount: round2(tx.amount),
        paymentMode: mode,
        paymentRef: tx.paymentRef,
        paymentDetails: tx.paymentDetails,
        notes: tx.description,
        dueDate: tx.dueDate,
        status: tx.status,
        transactionId: tx.id,
      });
    } else {
      rawEvents.push({
        id: tx.id,
        date: new Date(tx.date),
        createdAt: new Date(tx.createdAt),
        eventOrder: 0,
        activityType: 'RECEIVED_NEW',
        activityLabel: 'Taken (To Pay)',
        title: 'नई रकम ली (Borrowed)',
        moneyDirection: 'IN',
        balanceBucket: 'TO_PAY',
        amount: round2(tx.amount),
        paymentMode: mode,
        paymentRef: tx.paymentRef,
        paymentDetails: tx.paymentDetails,
        notes: tx.description,
        dueDate: tx.dueDate,
        status: tx.status,
        transactionId: tx.id,
      });
    }
  }

  for (const r of contact.repayments) {
    const repMode = (r.paymentMode as PaymentMethod) || 'CASH';
    const isLentRepay = r.transaction.type === 'GAVE';

    if (isLentRepay) {
      rawEvents.push({
        id: r.id,
        date: new Date(r.date),
        createdAt: new Date(r.createdAt),
        eventOrder: 1,
        activityType: 'LENT_REPAY',
        activityLabel: 'Received Back',
        title: 'पहले दी गई रकम वापस मिली (Received Back)',
        moneyDirection: 'IN',
        balanceBucket: 'TO_RECEIVE',
        amount: round2(r.amount),
        paymentMode: repMode,
        paymentRef: r.paymentRef,
        paymentDetails: r.paymentDetails,
        notes: r.notes,
        dueDate: null,
        transactionId: r.transactionId,
      });
    } else {
      rawEvents.push({
        id: r.id,
        date: new Date(r.date),
        createdAt: new Date(r.createdAt),
        eventOrder: 1,
        activityType: 'BORROWED_REPAY',
        activityLabel: 'Returned',
        title: 'पहले ली गई रकम वापस की (Returned)',
        moneyDirection: 'OUT',
        balanceBucket: 'TO_PAY',
        amount: round2(r.amount),
        paymentMode: repMode,
        paymentRef: r.paymentRef,
        paymentDetails: r.paymentDetails,
        notes: r.notes,
        dueDate: null,
        transactionId: r.transactionId,
      });
    }
  }

  rawEvents.sort((a, b) => {
    const dDiff = a.date.getTime() - b.date.getTime();
    if (dDiff !== 0) return dDiff;
    const cDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (cDiff !== 0) return cDiff;
    if (a.eventOrder !== b.eventOrder) return a.eventOrder - b.eventOrder;
    return a.id.localeCompare(b.id);
  });

  let runningToReceive = 0;
  let runningToPay = 0;

  return rawEvents.map((ev) => {
    const previousToReceive = round2(runningToReceive);
    const previousToPay = round2(runningToPay);
    const previousNetBalance = round2(runningToReceive - runningToPay);

    let previousBalance = 0;
    let updatedBalance = 0;

    if (ev.activityType === 'GAVE_NEW') {
      previousBalance = previousToReceive;
      runningToReceive = round2(runningToReceive + ev.amount);
      updatedBalance = runningToReceive;
    } else if (ev.activityType === 'LENT_REPAY') {
      previousBalance = previousToReceive;
      runningToReceive = round2(runningToReceive - ev.amount);
      updatedBalance = runningToReceive;
    } else if (ev.activityType === 'RECEIVED_NEW') {
      previousBalance = previousToPay;
      runningToPay = round2(runningToPay + ev.amount);
      updatedBalance = runningToPay;
    } else {
      previousBalance = previousToPay;
      runningToPay = round2(runningToPay - ev.amount);
      updatedBalance = runningToPay;
    }

    const updatedToReceive = round2(runningToReceive);
    const updatedToPay = round2(runningToPay);
    const updatedNetBalance = round2(runningToReceive - runningToPay);

    return {
      id: ev.id,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phone,
      date: ev.date,
      createdAt: ev.createdAt,
      activityType: ev.activityType,
      activityLabel: ev.activityLabel,
      title: ev.title,
      moneyDirection: ev.moneyDirection,
      balanceBucket: ev.balanceBucket,
      amount: ev.amount,
      previousBalance,
      updatedBalance,
      balanceAfter: updatedBalance,
      previousToReceive,
      updatedToReceive,
      previousToPay,
      updatedToPay,
      previousNetBalance,
      updatedNetBalance,
      paymentMode: ev.paymentMode,
      paymentRef: ev.paymentRef,
      paymentDetails: ev.paymentDetails,
      notes: ev.notes,
      dueDate: ev.dueDate,
      status: ev.status,
      transactionId: ev.transactionId,
    };
  });
}

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

  let totalGiven = 0;
  let totalTaken = 0;
  let totalReceivedBack = 0;
  let totalReturned = 0;
  let amountToReceive = 0;
  let amountToPay = 0;

  for (const tx of contact.transactions) {
    if (tx.type === 'GAVE') {
      totalGiven += tx.amount;
      amountToReceive += tx.balanceAmount;
      for (const r of tx.repayments) {
        totalReceivedBack += r.amount;
      }
    } else {
      totalTaken += tx.amount;
      amountToPay += tx.balanceAmount;
      for (const r of tx.repayments) {
        totalReturned += r.amount;
      }
    }
  }

  const netPosition = round2(amountToReceive - amountToPay);

  // Build deterministic chronological ledger and present newest first
  const activityLedger = buildContactChronologicalLedger(contact).reverse();

  let status: 'TO_RECEIVE' | 'TO_PAY' | 'SETTLED' = 'SETTLED';
  let statusLabel = 'हिसाब पूरा';

  if (amountToReceive > 0 && amountToPay === 0) {
    status = 'TO_RECEIVE';
    statusLabel = 'मुझे लेने हैं';
  } else if (amountToPay > 0 && amountToReceive === 0) {
    status = 'TO_PAY';
    statusLabel = 'मुझे देने हैं';
  } else if (amountToReceive > 0 || amountToPay > 0) {
    if (netPosition > 0) {
      status = 'TO_RECEIVE';
      statusLabel = 'मुझे लेने हैं';
    } else if (netPosition < 0) {
      status = 'TO_PAY';
      statusLabel = 'मुझे देने हैं';
    }
  }

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
    // The 6 Independent Figures + Net Position
    summary: {
      totalGiven: round2(totalGiven),                   // 1. कुल दी गई रकम
      totalTaken: round2(totalTaken),                   // 2. कुल ली गई रकम
      totalReceivedBack: round2(totalReceivedBack),     // 3. कुल वापस मिली रकम
      totalReturned: round2(totalReturned),             // 4. कुल वापस की गई रकम
      amountToReceive: round2(amountToReceive),         // 5. मुझे लेने हैं
      amountToPay: round2(amountToPay),                 // 6. मुझे देने हैं
      netPosition,                                     // 7. मेरी वर्तमान स्थिति
      status,
      statusLabel,
      // Backward compatibility aliases
      gaveOutstanding: round2(amountToReceive),
      receivedOutstanding: round2(amountToPay),
      totalGave: round2(totalGiven),
      totalReceived: round2(totalTaken),
      netBalance: netPosition,
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
      paymentMode: (tx.paymentMode as PaymentMethod) || 'CASH',
      paymentRef: tx.paymentRef,
      paymentDetails: tx.paymentDetails,
      status: tx.status,
      repayments: tx.repayments.map((r) => ({
        id: r.id,
        amount: round2(r.amount),
        date: r.date,
        paymentMode: (r.paymentMode as PaymentMethod) || 'CASH',
        paymentRef: r.paymentRef,
        paymentDetails: r.paymentDetails,
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
 * Creates a new "मैंने रकम दी" (GAVE) or "मुझे रकम मिली" (RECEIVED) entry
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
    throw new Error('रकम 0 से अधिक होनी चाहिए। (Amount must be greater than ₹0).');
  }

  const roundedAmount = round2(numAmount);
  let contactId = input.contactId;

  // If contactId is not given, find or create the contact by name/phone
  if (!contactId) {
    const personName = input.personName?.trim();
    if (!personName || personName.length < 2) {
      throw new Error('कृपया व्यक्ति का नाम दर्ज करें या चुनें।');
    }

    const rawPhone = input.phone?.trim() || null;

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
    const contact = await prisma.khataContact.findFirst({
      where: { id: contactId, businessId },
    });
    if (!contact) {
      throw new Error('संपर्क नहीं मिला या अनुमति नहीं है।');
    }

    if (input.phone && !contact.phone) {
      await prisma.khataContact.update({
        where: { id: contactId },
        data: { phone: input.phone.trim() },
      });
    }
  }

  const txDate = input.date ? new Date(input.date) : new Date();
  const txDueDate = input.dueDate ? new Date(input.dueDate) : null;
  const paymentMode: PaymentMethod = input.paymentMode || 'CASH';

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
      paymentMode,
      paymentRef: input.paymentRef?.trim() || null,
      paymentDetails: input.paymentDetails?.trim() || null,
      status: 'PENDING',
      settledAmount: 0,
      balanceAmount: roundedAmount,
    },
    include: {
      contact: true,
    },
  });

  await prisma.khataContact.update({
    where: { id: contactId },
    data: { updatedAt: new Date() },
  });

  return transaction;
}

/**
 * Updates an existing transaction
 */
export async function updateKhataTransaction(
  businessId: string,
  transactionId: string,
  input: {
    amount?: number;
    date?: string | Date;
    dueDate?: string | Date | null;
    description?: string | null;
    paymentMode?: PaymentMethod;
    paymentRef?: string | null;
    paymentDetails?: string | null;
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
  if (input.paymentMode !== undefined) {
    dataToUpdate.paymentMode = input.paymentMode;
  }
  if (input.paymentRef !== undefined) {
    dataToUpdate.paymentRef = input.paymentRef?.trim() || null;
  }
  if (input.paymentDetails !== undefined) {
    dataToUpdate.paymentDetails = input.paymentDetails?.trim() || null;
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
 * Records a full or partial repayment towards an outstanding balance.
 * Strictly prevents negative balances by enforcing repaymentAmount <= balanceAmount.
 * Supports passing either a specific transactionId OR a contactId with targetType ('GAVE' | 'RECEIVED').
 */
export async function recordKhataRepayment(
  businessId: string,
  userId: string,
  input: RecordKhataRepaymentInput
) {
  const numAmount = Number(input.amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('वापसी रकम 0 से अधिक होनी चाहिए। (Repayment amount must be > 0).');
  }

  const repaymentAmount = round2(numAmount);
  const repaymentDate = input.date ? new Date(input.date) : new Date();
  const paymentMode: PaymentMethod = input.paymentMode || 'CASH';

  // 1. Direct transaction repayment
  if (input.transactionId) {
    const transaction = await prisma.khataTransaction.findFirst({
      where: { id: input.transactionId, businessId },
      include: { contact: true },
    });

    if (!transaction) {
      throw new Error('प्रविष्टि नहीं मिली या अनुमति नहीं है।');
    }

    if (transaction.status === 'SETTLED' || transaction.balanceAmount <= 0) {
      throw new Error('यह हिसाब पहले ही पूरा हो चुका है। (Already settled).');
    }

    if (repaymentAmount > transaction.balanceAmount) {
      throw new Error(
        `वापसी रकम (₹${repaymentAmount}) बाकी रकम (₹${transaction.balanceAmount}) से अधिक नहीं हो सकती।`
      );
    }

    const newSettledAmount = round2(transaction.settledAmount + repaymentAmount);
    const newBalanceAmount = round2(transaction.amount - newSettledAmount);
    const newStatus: KhataEntryStatus = newBalanceAmount === 0 ? 'SETTLED' : 'PARTIAL';

    const [repayment, updatedTx] = await prisma.$transaction([
      prisma.khataRepayment.create({
        data: {
          businessId,
          userId,
          contactId: transaction.contactId,
          transactionId: transaction.id,
          amount: repaymentAmount,
          date: repaymentDate,
          paymentMode,
          paymentRef: input.paymentRef?.trim() || null,
          paymentDetails: input.paymentDetails?.trim() || null,
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

  // 2. Contact-level repayment across open transactions (FIFO)
  if (input.contactId && input.targetType) {
    const openTransactions = await prisma.khataTransaction.findMany({
      where: {
        businessId,
        contactId: input.contactId,
        type: input.targetType,
        balanceAmount: { gt: 0 },
      },
      orderBy: { date: 'asc' },
    });

    if (openTransactions.length === 0) {
      throw new Error('इस संपर्क का कोई बाकी हिसाब नहीं है। (No outstanding balance to repay).');
    }

    const totalOutstanding = round2(
      openTransactions.reduce((acc, tx) => acc + tx.balanceAmount, 0)
    );

    if (repaymentAmount > totalOutstanding) {
      throw new Error(
        `वापसी रकम (₹${repaymentAmount}) कुल बाकी रकम (₹${totalOutstanding}) से अधिक नहीं हो सकती।`
      );
    }

    let remainingToAllocate = repaymentAmount;
    const createdRepayments = [];
    let lastUpdatedTx = null;

    for (const tx of openTransactions) {
      if (remainingToAllocate <= 0) break;

      const allocation = Math.min(tx.balanceAmount, remainingToAllocate);
      const newSettled = round2(tx.settledAmount + allocation);
      const newBalance = round2(tx.amount - newSettled);
      const newStatus: KhataEntryStatus = newBalance === 0 ? 'SETTLED' : 'PARTIAL';

      const [rep, updatedTx] = await prisma.$transaction([
        prisma.khataRepayment.create({
          data: {
            businessId,
            userId,
            contactId: tx.contactId,
            transactionId: tx.id,
            amount: round2(allocation),
            date: repaymentDate,
            paymentMode,
            paymentRef: input.paymentRef?.trim() || null,
            paymentDetails: input.paymentDetails?.trim() || null,
            notes: input.notes?.trim() || null,
          },
        }),
        prisma.khataTransaction.update({
          where: { id: tx.id },
          data: {
            settledAmount: newSettled,
            balanceAmount: newBalance,
            status: newStatus,
            updatedAt: new Date(),
          },
          include: { contact: true, repayments: true },
        }),
      ]);

      createdRepayments.push(rep);
      lastUpdatedTx = updatedTx;
      remainingToAllocate = round2(remainingToAllocate - allocation);
    }

    await prisma.khataContact.update({
      where: { id: input.contactId },
      data: { updatedAt: new Date() },
    });

    return {
      repayment: createdRepayments[0],
      repayments: createdRepayments,
      transaction: lastUpdatedTx,
    };
  }

  throw new Error('कृपया प्रविष्टि या संपर्क का चयन करें। (transactionId or contactId required).');
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
    defaultMessage = `नमस्ते ${params.contactName} जी,\n\nयह आपके ₹${params.amount.toLocaleString(
      'en-IN'
    )} के बाकी हिसाब का एक विनम्र स्मरण है (${formattedTxDate}${
      formattedDueDate ? `, देय तिथि: ${formattedDueDate}` : ''
    })।\n\nकृपया सुविधानुसार भुगतान व्यवस्थित करें। धन्यवाद! 🙏\n- भेजा गया: पक्का चिट्ठा पर्सनल खाता`;
  } else {
    defaultMessage = `नमस्ते ${params.contactName} जी,\n\nयह आपके ₹${params.amount.toLocaleString(
      'en-IN'
    )} के बाकी हिसाब के संबंध में है (${formattedTxDate})। मैं शीघ्र भुगतान की व्यवस्था कर रहा हूँ।\n\nधन्यवाद! 🙏\n- भेजा गया: पक्का चिट्ठा पर्सनल खाता`;
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

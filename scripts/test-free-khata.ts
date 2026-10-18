import 'dotenv/config';
import { PrismaClient, KhataTransactionType, KhataEntryStatus, SubscriptionPlan } from '@prisma/client';
import { registerFreeKhataUser, loginUser } from '../src/lib/auth/service';
import {
  createKhataContact,
  getKhataContacts,
  createKhataTransaction,
  recordKhataRepayment,
  getKhataDashboardSummary,
  getKhataContactDetail,
  prepareWhatsAppReminder,
} from '../src/lib/services/khataService';
import { checkFeatureEntitlement } from '../src/lib/subscription/entitlements';
import { OFFICIAL_PLANS } from '../src/lib/subscription/plans';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runFreeKhataTests() {
  console.log('\n==================================================================');
  console.log('STARTING AUTOMATED ACCEPTANCE TEST SUITE: FREE UDHAAR KHATA');
  console.log('==================================================================\n');

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 1: Register and Use Free Khata Without Payment
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Free Khata Registration & Permanent Entitlement ---');

    const emailA = `freekhata_user_a_${runId}@lendentest.com`;
    const emailB = `freekhata_user_b_${runId}@lendentest.com`;

    const regResultA = await registerFreeKhataUser({
      name: 'Ramesh Sharma',
      email: emailA,
      password: 'SecurePassword123!',
      phone: '9876543210',
    });

    assert(Boolean(regResultA.user?.id), 'User A registered successfully');
    assert(Boolean(regResultA.business?.id), 'Personal Khata workspace provisioned');

    // Verify database record for Subscription
    const subscriptionA = await prisma.subscription.findFirst({
      where: { businessId: regResultA.business.id },
    });

    assert(subscriptionA?.plan === SubscriptionPlan.FREE_KHATA, 'Plan is strictly FREE_KHATA in database');
    assert(subscriptionA?.status === 'ACTIVE', 'Subscription status is ACTIVE');
    assert((subscriptionA?.trialDaysRemaining ?? 0) >= 999999, 'Free Khata has permanent non-expiring validity');

    // Verify login returns the Free Khata plan
    const loginResult = await loginUser({ email: emailA, password: 'SecurePassword123!' });
    assert(loginResult.business?.plan === 'FREE_KHATA', 'Login correctly identifies user on FREE_KHATA plan');

    // Verify entitlements
    const entitlement = await checkFeatureEntitlement(regResultA.business.id, 'canAccessFreeKhata');
    assert(entitlement.allowed === true, 'Feature entitlement check grants canAccessFreeKhata for FREE_KHATA');

    const invoiceEntitlement = await checkFeatureEntitlement(regResultA.business.id, 'canCreateInvoices');
    assert(invoiceEntitlement.allowed === false, 'Commercial Invoice Creation strictly disallowed for Free Khata');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 2: Unlimited Contacts and Ledger Entries
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Add Contacts and Multiple Ledger Entries Without Artificial Limits ---');

    const bizAId = regResultA.business.id;
    const userAId = regResultA.user.id;

    // Create 3 distinct contacts
    const contactSuresh = await createKhataContact(bizAId, userAId, {
      name: 'Suresh Kumar',
      phone: '9811122233',
      notes: 'Childhood friend',
    });
    assert(Boolean(contactSuresh.id), 'Contact Suresh Kumar created');

    const contactPooja = await createKhataContact(bizAId, userAId, {
      name: 'Pooja Verma',
      phone: '9822233344',
      notes: 'Colleague',
    });
    assert(Boolean(contactPooja.id), 'Contact Pooja Verma created');

    const contactAmit = await createKhataContact(bizAId, userAId, {
      name: 'Amit Patel',
      phone: '9833344455',
    });
    assert(Boolean(contactAmit.id), 'Contact Amit Patel created');

    // Verify contacts list
    const contactsList = await getKhataContacts(bizAId);
    assert(contactsList.length === 3, 'All 3 contacts retrieved for User A');

    // Add 12 transactions across contacts (verifying no artificial cap like 5 or 10)
    const batchEntries = [];
    for (let i = 1; i <= 6; i++) {
      batchEntries.push(
        createKhataTransaction(bizAId, userAId, {
          contactId: contactSuresh.id,
          type: KhataTransactionType.GAVE,
          amount: 500 * i,
          date: new Date(),
          description: `Lent for groceries batch #${i}`,
        })
      );
    }
    for (let j = 1; j <= 6; j++) {
      batchEntries.push(
        createKhataTransaction(bizAId, userAId, {
          contactId: contactPooja.id,
          type: KhataTransactionType.RECEIVED,
          amount: 300 * j,
          date: new Date(),
          description: `Borrowed for bill batch #${j}`,
        })
      );
    }
    const createdEntries = await Promise.all(batchEntries);
    assert(createdEntries.length === 12, '12 consecutive ledger entries created without artificial limit');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 3: Outstanding Balances Calculation (Gave vs Received)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: "I Gave" and "I Received" Outstanding Balance Math ---');

    // Setup fresh contact for clean arithmetic verification
    const contactDeepak = await createKhataContact(bizAId, userAId, {
      name: 'Deepak Gupta',
      phone: '9844455566',
    });

    // Deepak: I Gave ₹10,000
    const txGave = await createKhataTransaction(bizAId, userAId, {
      contactId: contactDeepak.id,
      type: KhataTransactionType.GAVE,
      amount: 10000,
      date: new Date('2026-03-01'),
      dueDate: new Date('2026-04-01'),
      description: 'Lent for laptop purchase',
    });

    assert(txGave.amount === 10000, 'Original Gave amount stored accurately (10000)');
    assert(txGave.settledAmount === 0, 'Initial settledAmount is 0');
    assert(txGave.balanceAmount === 10000, 'Initial balanceAmount is full 10000');
    assert(txGave.status === KhataEntryStatus.PENDING, 'Initial status is PENDING');

    // Deepak: I Received ₹4,000
    const txReceived = await createKhataTransaction(bizAId, userAId, {
      contactId: contactDeepak.id,
      type: KhataTransactionType.RECEIVED,
      amount: 4000,
      date: new Date('2026-03-05'),
      description: 'Borrowed for festival travel',
    });

    assert(txReceived.amount === 4000, 'Original Received amount stored accurately (4000)');
    assert(txReceived.settledAmount === 0, 'Initial received settledAmount is 0');
    assert(txReceived.balanceAmount === 4000, 'Initial received balanceAmount is 4000');
    assert(txReceived.status === KhataEntryStatus.PENDING, 'Initial received status is PENDING');

    // Check Deepak ledger calculation
    const deepakLedger = await getKhataContactDetail(bizAId, contactDeepak.id);
    assert(deepakLedger?.summary.totalGave === 10000, 'Deepak ledger totalGave is 10000');
    assert(deepakLedger?.summary.totalReceived === 4000, 'Deepak ledger totalReceived is 4000');
    assert(deepakLedger?.summary.gaveOutstanding === 10000, 'Deepak ledger gaveOutstanding is 10000');
    assert(deepakLedger?.summary.receivedOutstanding === 4000, 'Deepak ledger receivedOutstanding is 4000');
    assert(deepakLedger?.summary.netBalance === 6000, 'Deepak net balance is +6000 (I will receive ₹6,000 net)');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 4: Partial and Full Repayments & Over-repayment Guard
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Partial / Full Repayments & Negative Balance Guard ---');

    // Partial Repayment 1: Deepak returns ₹3,500
    const rep1 = await recordKhataRepayment(bizAId, userAId, {
      transactionId: txGave.id,
      amount: 3500,
      date: new Date('2026-03-10'),
      paymentMode: 'UPI',
      notes: 'First installment via GPay',
    });

    assert(rep1.transaction.settledAmount === 3500, 'Settled amount after partial repayment is 3500');
    assert(rep1.transaction.balanceAmount === 6500, 'Remaining balance updated to 6500');
    assert(rep1.transaction.status === KhataEntryStatus.PARTIAL, 'Status transitioned to PARTIAL');

    // Partial Repayment 2: Deepak returns another ₹2,500
    const rep2 = await recordKhataRepayment(bizAId, userAId, {
      transactionId: txGave.id,
      amount: 2500,
      date: new Date('2026-03-15'),
      paymentMode: 'CASH',
      notes: 'Cash in hand',
    });

    assert(rep2.transaction.settledAmount === 6000, 'Settled amount is now 6000');
    assert(rep2.transaction.balanceAmount === 4000, 'Remaining balance is now 4000');
    assert(rep2.transaction.status === KhataEntryStatus.PARTIAL, 'Status remains PARTIAL');

    // Over-repayment prevention test: Attempt to pay ₹5,000 when only ₹4,000 is due
    let overpaymentBlocked = false;
    try {
      await recordKhataRepayment(bizAId, userAId, {
        transactionId: txGave.id,
        amount: 5000, // Exceeds balance of 4000
        paymentMode: 'UPI',
      });
    } catch (err: any) {
      if (err.message.includes('exceed') || err.message.includes('exceeds')) {
        overpaymentBlocked = true;
      }
    }
    assert(overpaymentBlocked, 'Negative balance prevented: Over-repayment of ₹5,000 against ₹4,000 balance strictly rejected');

    // Full final repayment: Deepak returns remaining ₹4,000
    const rep3 = await recordKhataRepayment(bizAId, userAId, {
      transactionId: txGave.id,
      amount: 4000,
      date: new Date('2026-03-20'),
      paymentMode: 'BANK_TRANSFER',
      notes: 'Final settlement',
    });

    assert(rep3.transaction.settledAmount === 10000, 'Settled amount is now 10000 (100%)');
    assert(rep3.transaction.balanceAmount === 0, 'Remaining balance is 0');
    assert(rep3.transaction.status === KhataEntryStatus.SETTLED, 'Status transitioned to SETTLED');

    // Verify dashboard decoupling: Repayments must NOT inflate original "Total I Gave"
    const deepakLedgerAfter = await getKhataContactDetail(bizAId, contactDeepak.id);
    assert(deepakLedgerAfter?.summary.totalGave === 10000, 'Total I Gave remains ₹10,000 (repayments NOT counted as new loans)');
    assert(deepakLedgerAfter?.summary.gaveOutstanding === 0, 'Money to collect from Deepak is now 0');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 5: WhatsApp Reminders (Manual Handoff Preview & wa.me URL)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: WhatsApp Reminder Preview & Manual Handoff ---');

    // Setup an outstanding transaction for reminder
    const txPendingForReminder = await createKhataTransaction(bizAId, userAId, {
      contactId: contactAmit.id,
      type: KhataTransactionType.GAVE,
      amount: 7500,
      date: new Date('2026-02-15'),
      dueDate: new Date('2026-03-15'),
      description: 'Shop stock purchase support',
    });

    const reminderData = prepareWhatsAppReminder({
      contactName: contactAmit.name,
      phone: contactAmit.phone,
      amount: txPendingForReminder.balanceAmount,
      date: txPendingForReminder.date,
      dueDate: txPendingForReminder.dueDate,
      type: txPendingForReminder.type as 'GAVE' | 'RECEIVED',
    });

    assert(reminderData.recipientName === 'Amit Patel', 'Reminder recipient is Amit Patel');
    assert(reminderData.amount === 7500, 'Reminder amount is ₹7,500');
    assert(reminderData.cleanPhone === '919833344455', 'Phone sanitized with country code for WhatsApp standard');
    assert(reminderData.defaultMessage.includes('Amit Patel'), 'Preview message includes person name');
    assert(reminderData.defaultMessage.includes('7,500'), 'Preview message includes formatted amount');
    assert(reminderData.defaultMessage.includes('Pakka Chittha') || reminderData.defaultMessage.includes('Lenden'), 'Preview message maintains brand context');
    assert(reminderData.waUrl.startsWith('https://wa.me/919833344455?text='), 'Generates valid wa.me direct URL');

    // Verify transaction was NOT marked sent or modified simply because reminder was prepared
    const txCheck = await prisma.khataTransaction.findUnique({
      where: { id: txPendingForReminder.id },
    });
    assert(txCheck?.status === KhataEntryStatus.PENDING, 'Transaction state unchanged (no fake read/delivered mark)');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 6: Multi-Tenant Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Multi-Tenant Data Isolation ---');

    // Register User B
    const regResultB = await registerFreeKhataUser({
      name: 'Sunita Rao',
      email: emailB,
      password: 'SecurePassword456!',
      phone: '9765432109',
    });

    const bizBId = regResultB.business.id;
    const userBId = regResultB.user.id;

    // Verify User B's dashboard is completely isolated (0 contacts, 0 transactions)
    const summaryB = await getKhataDashboardSummary(bizBId);
    assert(summaryB.kpis.totalGave === 0, 'User B has 0 Gave');
    assert(summaryB.kpis.totalReceived === 0, 'User B has 0 Received');
    assert(summaryB.kpis.totalContacts === 0, 'User B has 0 contacts');

    // User B attempts to access User A's contacts -> should return empty
    const contactsB = await getKhataContacts(bizBId);
    assert(contactsB.length === 0, 'User B sees none of User A\'s contacts');

    // User B attempts to fetch User A's contact detail -> returns error / throws access denied
    let crossDetailBlocked = false;
    try {
      await getKhataContactDetail(bizBId, contactDeepak.id);
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('access denied')) {
        crossDetailBlocked = true;
      }
    }
    assert(crossDetailBlocked, 'User B cannot view User A\'s contact ledger (throws access denied)');

    // User B attempts to record repayment on User A's transaction -> strictly rejected
    let crossTenantRepaymentBlocked = false;
    try {
      await recordKhataRepayment(bizBId, userBId, {
        transactionId: txPendingForReminder.id,
        amount: 500,
        paymentMode: 'UPI',
      });
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('Access Denied')) {
        crossTenantRepaymentBlocked = true;
      }
    }
    assert(crossTenantRepaymentBlocked, 'Cross-tenant repayment rejected with security error');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 7: Free Khata Remains Available Without Expiry
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Permanent Validity Without Expiry or Forced Upgrade ---');

    const planConfig = OFFICIAL_PLANS.FREE_KHATA;
    assert(planConfig.pricing.MONTHLY.totalPrice === 0, 'Free Khata plan price is 0 INR');
    assert(planConfig.entitlements.canAccessFreeKhata === true, 'canAccessFreeKhata flag is true');
    assert(planConfig.limits.maxMonthlyInvoices === 0, 'Commercial invoice limit is 0 (isolated)');
    assert(planConfig.entitlements.canCreateInvoices === false, 'Commercial invoice creation is disallowed');
    assert(planConfig.entitlements.canConfigureGst === false, 'Commercial GST configuration is disallowed');

    // ------------------------------------------------------------------------
    // ACCEPTANCE TEST 8: Paid Plans, Billing and Commercial Features Unaffected
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Existing Paid Plans & Commercial Isolation ---');

    assert(OFFICIAL_PLANS.STARTER.pricing.MONTHLY.totalPrice === 199, 'STARTER plan price is unchanged (199 INR)');
    assert(OFFICIAL_PLANS.GROWTH.pricing.MONTHLY.totalPrice === 499, 'GROWTH plan price is unchanged (499 INR)');
    assert(OFFICIAL_PLANS.SCALE.pricing.MONTHLY.totalPrice === 999, 'SCALE plan price is unchanged (999 INR)');

    assert(OFFICIAL_PLANS.STARTER.entitlements.canCreateInvoices === true, 'STARTER continues to have commercial invoices');
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canCustomLogoInvoice === true, 'GROWTH continues to have custom branding');
    assert(OFFICIAL_PLANS.SCALE.limits.isUnlimitedInvoices === true, 'SCALE continues to have unlimited invoices');
    assert(OFFICIAL_PLANS.SCALE.entitlements.canMultiLocation === true, 'SCALE continues to have multi-location');

    // Clean up test data
    console.log('\n--- Cleaning Up Acceptance Test Entities ---');
    await prisma.khataRepayment.deleteMany({
      where: {
        transaction: {
          businessId: { in: [bizAId, bizBId] },
        },
      },
    });
    await prisma.khataTransaction.deleteMany({
      where: { businessId: { in: [bizAId, bizBId] } },
    });
    await prisma.khataContact.deleteMany({
      where: { businessId: { in: [bizAId, bizBId] } },
    });
    await prisma.subscription.deleteMany({
      where: { businessId: { in: [bizAId, bizBId] } },
    });
    await prisma.session.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.businessMembership.deleteMany({
      where: { businessId: { in: [bizAId, bizBId] } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [bizAId, bizBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    console.log('  ✓ Test tenant records cleaned up cleanly');

    console.log('\n==================================================================');
    console.log(`ACCEPTANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal error running acceptance tests:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFreeKhataTests();

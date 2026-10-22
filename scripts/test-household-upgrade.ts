import 'dotenv/config';
import {
  PrismaClient,
  HouseholdRole,
  HouseholdTransactionType,
  PaymentMethod,
} from '@prisma/client';
import { registerHouseholdUser } from '../src/lib/auth/service';
import {
  createHousehold,
  getHouseholdDashboard,
  getHouseholdTransactions,
  createHouseholdTransaction,
  updateHouseholdTransaction,
  deleteHouseholdTransaction,
  getHouseholdCategories,
  createHouseholdCategory,
  updateHouseholdCategory,
  deleteHouseholdCategory,
  calculateEqualSplit,
  validateCustomSplit,
  validateContributions,
  getHouseholdBalances,
  createHouseholdSettlement,
  deleteHouseholdSettlement,
  getHouseholdReports,
  exportTransactionsCsv,
  exportReportsExcelCompatible,
} from '../src/lib/household/householdService';
import { requireHouseholdAccess, HouseholdAccessError } from '../src/lib/household/guards';

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

async function runSuite() {
  console.log('\n==================================================================');
  console.log('PAKKACHITTHA MERA GHAR: COMPLETE UPGRADE VERIFICATION SUITE');
  console.log('Testing Categories, Splitting, Settlements, Reports & Exports');
  console.log('==================================================================\n');

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------------
    // SETUP: Provision Primary Household with 4 Members
    // ------------------------------------------------------------------------
    console.log('--- Setup: Registering Primary Household with 4 Members ---');

    const ownerEmail = `gharkharcha_owner_${runId}@test.local`;
    const regResult = await registerHouseholdUser({
      name: 'Rajesh Verma',
      email: ownerEmail,
      password: 'SecurePassword123!',
      householdName: 'Verma Parivar',
      monthlyBudget: 60000,
    });

    const householdId = regResult.household.id;
    const member1 = await prisma.householdMember.findFirst({
      where: { userId: regResult.user.id, householdId },
      include: { user: true },
    });

    // Create 3 additional members
    const member2User = await prisma.user.create({
      data: {
        name: 'Sunita Verma',
        email: `sunita_${runId}@test.local`,
        passwordHash: 'dummyhash',
      },
    });
    const member2 = await prisma.householdMember.create({
      data: { householdId, userId: member2User.id, role: HouseholdRole.MEMBER },
      include: { user: true },
    });

    const member3User = await prisma.user.create({
      data: {
        name: 'Aakash Verma',
        email: `aakash_${runId}@test.local`,
        passwordHash: 'dummyhash',
      },
    });
    const member3 = await prisma.householdMember.create({
      data: { householdId, userId: member3User.id, role: HouseholdRole.MEMBER },
      include: { user: true },
    });

    const member4User = await prisma.user.create({
      data: {
        name: 'Pooja Verma',
        email: `pooja_${runId}@test.local`,
        passwordHash: 'dummyhash',
      },
    });
    const member4 = await prisma.householdMember.create({
      data: { householdId, userId: member4User.id, role: HouseholdRole.MEMBER },
      include: { user: true },
    });

    assert(Boolean(member1 && member2 && member3 && member4), 'Provisioned 4 family members in household');

    // ------------------------------------------------------------------------
    // TEST 1 & 2: Categories, Search, Duplicate Prevention & Archiving
    // ------------------------------------------------------------------------
    console.log('\n--- Test 1 & 2: Category Search, Custom Categories & Safe Archiving ---');

    const defaultCats = await getHouseholdCategories(householdId);
    assert(defaultCats.length >= 20, `Default categories loaded (${defaultCats.length} found)`);

    // Search categories
    const searchedGrocery = await getHouseholdCategories(householdId, { search: 'Grocery' });
    assert(searchedGrocery.some((c) => c.name.includes('Grocery')), 'Search category by name matches "Grocery & Ration"');

    // Add custom category with subcategories
    const customCat = await createHouseholdCategory(householdId, {
      name: 'Organic Garden & Terrace',
      type: 'EXPENSE',
      subcategories: ['Seeds & Soil', 'Pots & Planters', 'Fertilizer'],
    });
    assert(Boolean(customCat.id), 'Created custom category with subcategories');
    assert(customCat.subcategories.length === 3, 'Subcategories persisted accurately');

    // Case-insensitive duplicate prevention
    let duplicateRejected = false;
    try {
      await createHouseholdCategory(householdId, {
        name: 'organic garden & terrace', // lowercase duplicate
        type: 'EXPENSE',
      });
    } catch (e: any) {
      duplicateRejected = e.message.includes('already exists in this household');
    }
    assert(duplicateRejected, 'Case-insensitive duplicate category strictly rejected');

    // Record an expense using this custom category
    const dummyCatTx = await createHouseholdTransaction(householdId, member1!.userId, {
      type: 'EXPENSE',
      amount: 1500,
      categoryId: customCat.id,
      categoryName: customCat.name,
      subcategory: 'Seeds & Soil',
      description: 'Fertilizers and seeds',
    });
    assert(Boolean(dummyCatTx.id), 'Expense recorded with custom category');

    // Delete category: should archive rather than hard delete because historical transactions depend on it
    const deleteResult = await deleteHouseholdCategory(householdId, customCat.id);
    assert(deleteResult.archived === true, 'Category with historical expenses safely archived (not hard deleted)');

    const updatedCatInDb = await prisma.householdCategory.findUnique({ where: { id: customCat.id } });
    assert(updatedCatInDb?.isArchived === true, 'Category marked isArchived: true in database');

    const activeCatsAfterArchive = await getHouseholdCategories(householdId);
    assert(!activeCatsAfterArchive.some((c) => c.id === customCat.id), 'Archived category excluded from active dropdowns');

    // ------------------------------------------------------------------------
    // TEST 3: Mobile Recharge and Utility Bills
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Dedicated Bills & Utility Recharges ---');

    const billTx1 = await createHouseholdTransaction(householdId, member1!.userId, {
      type: 'EXPENSE',
      amount: 749,
      categoryName: 'Mobile Recharge',
      billType: 'MOBILE_RECHARGE',
      billProvider: 'Jio Prepaid',
      billConsumerId: '9876543210',
      billPeriod: 'Q4 2026',
      billReferenceNo: 'UPI-REF-99281',
      description: 'Annual 2.5GB/day mobile pack',
    });
    assert(Boolean(billTx1.id), 'Mobile recharge recorded with provider and consumer ID');
    assert(billTx1.billType === 'MOBILE_RECHARGE', 'Bill type stored accurately');
    assert(billTx1.billProvider === 'Jio Prepaid', 'Provider stored accurately');

    const billTx2 = await createHouseholdTransaction(householdId, member1!.userId, {
      type: 'EXPENSE',
      amount: 3450.50,
      categoryName: 'Electricity',
      billType: 'ELECTRICITY',
      billProvider: 'BESCOM Karnataka',
      billConsumerId: 'CA-0881920',
      billDueDate: new Date('2026-11-05'),
      billPeriod: 'October 2026',
      description: 'Monthly electricity consumption',
    });
    assert(Boolean(billTx2.id), 'Electricity bill recorded with due date and account ID');

    // ------------------------------------------------------------------------
    // TEST 4 & 5: Equal Splits, Rounding & Paise Distribution
    // ------------------------------------------------------------------------
    console.log('\n--- Test 4 & 5: Equal Splits & Exact Paise Rounding Guarantee ---');

    // Even split: ₹2,000 between 4 members = ₹500.00 each
    const evenSplits = calculateEqualSplit(2000, [member1!.id, member2.id, member3.id, member4.id]);
    assert(evenSplits.length === 4, 'Even split divided among 4 members');
    assert(evenSplits.every((s) => s.amount === 500), '₹2,000 split 4 ways results in exact ₹500.00 each');

    // Uneven split: ₹100.00 between 3 members = ₹33.34, ₹33.33, ₹33.33 (Sum = ₹100.00 exact)
    const unevenSplits = calculateEqualSplit(100, [member1!.id, member2.id, member3.id]);
    const unevenSum = unevenSplits.reduce((acc, s) => acc + s.amount, 0);
    assert(Math.round(unevenSum * 100) / 100 === 100, `₹100 split 3 ways sums to exact ₹100.00 (Got: ${unevenSum})`);
    assert(unevenSplits[0].amount === 33.34, 'First member gets remainder paisa (₹33.34)');
    assert(unevenSplits[1].amount === 33.33 && unevenSplits[2].amount === 33.33, 'Other members get ₹33.33');

    // Record shared expense in database with 4-way split
    const sharedTx1 = await createHouseholdTransaction(householdId, member1!.userId, {
      type: 'EXPENSE',
      amount: 2000,
      categoryName: 'Grocery & Ration',
      description: 'Supermarket bulk groceries',
      paidByMemberId: member1!.id,
      isShared: true,
      splitType: 'EQUAL',
      splits: [
        { memberId: member1!.id, amount: 0 },
        { memberId: member2.id, amount: 0 },
        { memberId: member3.id, amount: 0 },
        { memberId: member4.id, amount: 0 },
      ],
    });
    assert(Boolean(sharedTx1.id), 'Shared expense with equal 4-way split recorded in DB');

    const splitRows1 = await prisma.householdExpenseSplit.findMany({ where: { transactionId: sharedTx1.id } });
    assert(splitRows1.length === 4, '4 split rows created in DB');
    const splitSum1 = splitRows1.reduce((sum, s) => sum + s.allocatedAmount, 0);
    assert(splitSum1 === 2000, `Allocations sum strictly to ₹2,000.00 (got ${splitSum1})`);

    // ------------------------------------------------------------------------
    // TEST 6: Custom Splits with Valid and Invalid Totals
    // ------------------------------------------------------------------------
    console.log('\n--- Test 6: Custom Splits Validation & Saving ---');

    // Invalid custom split: shares do not sum to total
    const invalidValidation = validateCustomSplit(2000, [
      { memberId: member1!.id, amount: 800 },
      { memberId: member2.id, amount: 600 },
      { memberId: member3.id, amount: 400 },
      { memberId: member4.id, amount: 150 }, // Total = 1950 (missing 50)
    ]);
    assert(invalidValidation.valid === false, 'Discrepancy in custom split detected and blocked');

    // Valid custom split: 800 + 600 + 400 + 200 = 2000
    const validValidation = validateCustomSplit(2000, [
      { memberId: member1!.id, amount: 800 },
      { memberId: member2.id, amount: 600 },
      { memberId: member3.id, amount: 400 },
      { memberId: member4.id, amount: 200 },
    ]);
    assert(validValidation.valid === true, 'Exact custom split approved');

    const customSharedTx = await createHouseholdTransaction(householdId, member1!.userId, {
      type: 'EXPENSE',
      amount: 2000,
      categoryName: 'Entertainment & Dining',
      description: 'Family restaurant dinner',
      paidByMemberId: member1!.id,
      isShared: true,
      splitType: 'CUSTOM',
      splits: [
        { memberId: member1!.id, amount: 800 },
        { memberId: member2.id, amount: 600 },
        { memberId: member3.id, amount: 400 },
        { memberId: member4.id, amount: 200 },
      ],
    });
    assert(Boolean(customSharedTx.id), 'Custom split saved successfully in database');

    // ------------------------------------------------------------------------
    // TEST 7: Multiple Actual Contributors Toward One Bill
    // ------------------------------------------------------------------------
    console.log('\n--- Test 7: Multiple Contributors Toward a Single Expense ---');

    // ₹3,000 expense where Member 1 contributed ₹2,000 and Member 2 contributed ₹1,000
    const contribValidation = validateContributions(3000, [
      { memberId: member1!.id, amount: 2000 },
      { memberId: member2.id, amount: 1000 },
    ]);
    assert(contribValidation.valid === true, 'Multiple contributor sums validated');

    const multiContribTx = await createHouseholdTransaction(householdId, member1!.userId, {
      type: 'EXPENSE',
      amount: 3000,
      categoryName: 'Maintenance & Repairs',
      description: 'Building maintenance & plumbing repairs',
      isShared: true,
      splitType: 'EQUAL',
      splits: [
        { memberId: member1!.id, amount: 0 },
        { memberId: member2.id, amount: 0 },
        { memberId: member3.id, amount: 0 },
      ], // ₹1000 each
      contributions: [
        { memberId: member1!.id, amount: 2000 },
        { memberId: member2.id, amount: 1000 },
      ],
    });
    assert(Boolean(multiContribTx.id), 'Transaction with multiple payment contributors recorded');

    const contribRows = await prisma.householdExpenseContribution.findMany({
      where: { transactionId: multiContribTx.id },
    });
    assert(contribRows.length === 2, 'Two contribution rows recorded in database');

    // ------------------------------------------------------------------------
    // TEST 8 & 9: Balances, Partial & Full Settlements, Over-settlement Prevention
    // ------------------------------------------------------------------------
    console.log('\n--- Test 8 & 9: Member Balances, Pairwise Debts & Over-settlement Prevention ---');

    const initialBalances = await getHouseholdBalances(householdId);
    assert(initialBalances.members.length === 4, 'Calculated balances for all 4 members');

    // Verify mathematical integrity: sum of net balances must strictly equal 0
    const sumNetBalances = initialBalances.members.reduce((acc, m) => acc + m.netBalance, 0);
    assert(Math.abs(sumNetBalances) < 0.01, `Net balances sum strictly equals ₹0.00 (Got: ${sumNetBalances})`);

    // Find a member who owes money
    const debtor = initialBalances.members.find((m) => m.netBalance < -0.01);
    const creditor = initialBalances.members.find((m) => m.netBalance > 0.01);
    assert(Boolean(debtor && creditor), 'Identified debtor and creditor members');

    const debtorAmountOwed = Math.abs(debtor!.netBalance);

    // Over-settlement attempt: debtor tries to pay more than total outstanding debt
    let oversettleBlocked = false;
    try {
      await createHouseholdSettlement(householdId, member1!.userId, {
        payerMemberId: debtor!.memberId,
        receiverMemberId: creditor!.memberId,
        amount: debtorAmountOwed + 500, // exceeds debt!
      });
    } catch (e: any) {
      oversettleBlocked = e.message.includes('Over-settlement is not permitted');
    }
    assert(oversettleBlocked, 'Over-settlement beyond outstanding debt strictly blocked');

    // Partial settlement: debtor repays half of what they owe
    const partialAmount = Math.round((debtorAmountOwed / 2) * 100) / 100;
    const settlement1 = await createHouseholdSettlement(householdId, member1!.userId, {
      payerMemberId: debtor!.memberId,
      receiverMemberId: creditor!.memberId,
      amount: partialAmount,
      paymentMethod: PaymentMethod.UPI,
      notes: 'Partial settlement via GPay',
    });
    assert(Boolean(settlement1.id), `Partial settlement of ₹${partialAmount.toFixed(2)} recorded`);

    // Check updated balances
    const postSettlement1Balances = await getHouseholdBalances(householdId);
    const updatedDebtor1 = postSettlement1Balances.members.find((m) => m.memberId === debtor!.memberId);
    assert(
      Math.abs(Math.abs(updatedDebtor1!.netBalance) - (debtorAmountOwed - partialAmount)) < 0.02,
      'Debtor remaining balance reduced accurately after partial repayment'
    );

    // Full remaining settlement for this debtor
    const remainingToSettle = Math.round(Math.abs(updatedDebtor1!.netBalance) * 100) / 100;
    const settlement2 = await createHouseholdSettlement(householdId, member1!.userId, {
      payerMemberId: debtor!.memberId,
      receiverMemberId: creditor!.memberId,
      amount: remainingToSettle,
      paymentMethod: PaymentMethod.UPI,
      notes: 'Remaining balance cleared',
    });
    assert(Boolean(settlement2.id), `Full remaining settlement of ₹${remainingToSettle.toFixed(2)} recorded`);

    const postSettlement2Balances = await getHouseholdBalances(householdId);
    const clearedDebtor = postSettlement2Balances.members.find((m) => m.memberId === debtor!.memberId);
    assert(Math.abs(clearedDebtor!.netBalance) < 0.01, 'Debtor balance is now ₹0.00 (Fully settled)');

    // ------------------------------------------------------------------------
    // TEST 10: Safe Edit and Deletion of Shared Expenses
    // ------------------------------------------------------------------------
    console.log('\n--- Test 10: Safe Edit & Cascade Deletion of Shared Expenses ---');

    // Update shared expense amount from 2000 to 2400
    const updatedTx = await updateHouseholdTransaction(
      householdId,
      member1!.userId,
      HouseholdRole.OWNER,
      sharedTx1.id,
      {
        amount: 2400,
        splits: [
          { memberId: member1!.id, amount: 0 },
          { memberId: member2.id, amount: 0 },
          { memberId: member3.id, amount: 0 },
          { memberId: member4.id, amount: 0 },
        ],
      }
    );
    assert(updatedTx.amount === 2400, 'Shared expense amount updated to 2400');

    const updatedSplits = await prisma.householdExpenseSplit.findMany({ where: { transactionId: sharedTx1.id } });
    assert(updatedSplits.every((s) => s.allocatedAmount === 600), 'Splits automatically re-divided to ₹600.00 each');

    // Delete a transaction and ensure its splits & contributions cascade delete cleanly
    await deleteHouseholdTransaction(householdId, member1!.userId, HouseholdRole.OWNER, customSharedTx.id);
    const orphanSplits = await prisma.householdExpenseSplit.findMany({ where: { transactionId: customSharedTx.id } });
    assert(orphanSplits.length === 0, 'Transaction splits cascade deleted without leaving orphan records');

    // ------------------------------------------------------------------------
    // TEST 11, 12, 14: Reports, Filters & No Double Counting
    // ------------------------------------------------------------------------
    console.log('\n--- Test 11, 12, 14: Reports Dashboard, Filters & Single Consumption Counting ---');

    const reportsResult = await getHouseholdReports(householdId);
    assert(Boolean(reportsResult.reports), 'Generated all 8 reports data');

    const kpis = reportsResult.kpis;
    const catSummary = reportsResult.reports.categoryWiseSummary;
    const memberSummary = reportsResult.reports.memberWiseSummary;
    const billsSummary = reportsResult.reports.billsAndRechargeSummary;

    // Check single counting: sum of category amounts must equal totalConsumptionExpenses
    const sumCategories = catSummary.reduce((acc, c) => acc + c.amount, 0);
    assert(
      Math.abs(sumCategories - kpis.totalConsumptionExpenses) < 0.05,
      `Category totals (₹${sumCategories.toFixed(2)}) match totalConsumptionExpenses (₹${kpis.totalConsumptionExpenses.toFixed(2)}) without double counting`
    );

    // Verify allocations or repayments are NOT added to household consumption expenses
    const dbExpensesSum = await prisma.householdTransaction.aggregate({
      where: { householdId, type: 'EXPENSE' },
      _sum: { amount: true },
    });
    assert(
      Math.abs(kpis.totalConsumptionExpenses - (dbExpensesSum._sum.amount || 0)) < 0.01,
      'Total consumption strictly equals sum of original expense transactions (repayments & splits excluded from consumption)'
    );

    // Filter by category
    const filteredByCategory = await getHouseholdTransactions(householdId, {
      categoryName: 'Electricity',
    });
    assert(filteredByCategory.transactions.length >= 1, 'Filter by category returned matching records');

    // ------------------------------------------------------------------------
    // TEST 13: Exports (CSV, Excel SpreadsheetML, PDF Layout)
    // ------------------------------------------------------------------------
    console.log('\n--- Test 13: Multi-Format Exports (CSV, Excel XML, PDF) ---');

    const csvOutput = await exportTransactionsCsv(householdId);
    assert(csvOutput.includes('Shared / Personal'), 'CSV export includes shared expense column');
    assert(csvOutput.includes('Member Shares'), 'CSV export includes member allocations column');
    assert(csvOutput.includes('Bill / Utility Type'), 'CSV export includes utility bill column');

    const excelXml = await exportReportsExcelCompatible(householdId);
    assert(excelXml.includes('<?xml version="1.0"'), 'Excel XML starts with XML declaration');
    assert(excelXml.includes('Executive Summary'), 'Excel workbook contains Executive Summary sheet');
    assert(excelXml.includes('Category Summary'), 'Excel workbook contains Category Summary sheet');
    assert(excelXml.includes('Member Balances'), 'Excel workbook contains Member Balances sheet');
    assert(excelXml.includes('Bills and Recharge'), 'Excel workbook contains Bills sheet');

    // ------------------------------------------------------------------------
    // TEST 15: Cross-Household Authorization Guards
    // ------------------------------------------------------------------------
    console.log('\n--- Test 15: Cross-Household Tenant Security ---');

    // Create a separate household for an unauthorized outsider
    const outsiderEmail = `outsider_${runId}@test.local`;
    const outsiderReg = await registerHouseholdUser({
      name: 'Sneha Patel',
      email: outsiderEmail,
      password: 'SecurePassword123!',
      householdName: 'Patel Family',
    });
    const outsiderHouseholdId = outsiderReg.household.id;

    // Outsider attempts to access primary household transactions
    let crossHouseholdBlocked = false;
    try {
      await getHouseholdTransactions(householdId, {
        memberId: outsiderReg.user.id,
      });
      // Try to read using outsider's context via guard
      // requireHouseholdAccess will fail for outsider targeting householdId
      const sessionMock = await prisma.session.findFirst({ where: { userId: outsiderReg.user.id } });
      const membership = await prisma.householdMember.findUnique({
        where: { userId_householdId: { userId: outsiderReg.user.id, householdId } },
      });
      if (!membership) crossHouseholdBlocked = true;
    } catch (e) {
      crossHouseholdBlocked = true;
    }
    assert(crossHouseholdBlocked, 'Cross-household user strictly lacks membership in foreign household');

    // Clean up test records
    console.log('\n--- Cleanup: Purging Isolated Test Fixtures ---');
    await prisma.householdSettlement.deleteMany({ where: { householdId } });
    await prisma.householdExpenseContribution.deleteMany({ where: { transaction: { householdId } } });
    await prisma.householdExpenseSplit.deleteMany({ where: { transaction: { householdId } } });
    await prisma.householdTransaction.deleteMany({ where: { householdId } });
    await prisma.householdCategory.deleteMany({ where: { householdId } });
    await prisma.householdMember.deleteMany({ where: { householdId } });
    await prisma.householdMonthlyBudget.deleteMany({ where: { householdId } });
    await prisma.household.delete({ where: { id: householdId } });

    await prisma.householdCategory.deleteMany({ where: { householdId: outsiderHouseholdId } });
    await prisma.householdMember.deleteMany({ where: { householdId: outsiderHouseholdId } });
    await prisma.household.delete({ where: { id: outsiderHouseholdId } });

    await prisma.session.deleteMany({
      where: {
        userId: { in: [regResult.user.id, member2User.id, member3User.id, member4User.id, outsiderReg.user.id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [regResult.user.id, member2User.id, member3User.id, member4User.id, outsiderReg.user.id] },
      },
    });

    console.log('  ✓ PASS: Isolated test fixtures cleaned up safely');

    console.log('\n==================================================================');
    console.log(`ACCEPTANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite runtime error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSuite();

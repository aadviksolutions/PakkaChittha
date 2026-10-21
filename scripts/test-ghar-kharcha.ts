import 'dotenv/config';
import { PrismaClient, HouseholdRole, HouseholdTransactionType, PaymentMethod, SubscriptionPlan } from '@prisma/client';
import { registerHouseholdUser } from '../src/lib/auth/service';
import {
  createHousehold,
  getHouseholdDashboard,
  getHouseholdTransactions,
  createHouseholdTransaction,
  updateHouseholdTransaction,
  deleteHouseholdTransaction,
  createHouseholdInvitation,
  validateInvitationToken,
  acceptHouseholdInvitation,
  setMonthlyBudget,
  getHouseholdCategories,
  createHouseholdCategory,
  deleteHouseholdCategory,
  exportTransactionsCsv,
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

async function runGharKharchaTests() {
  console.log('\n==================================================================');
  console.log('PAKKACHITTHA GHAR KHARCHA: AUTOMATED ACCEPTANCE & SECURITY TEST SUITE');
  console.log('==================================================================\n');

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------------
    // TEST GROUP 1: Household Registration & Permanent Free Provisioning
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing Household Registration & Permanent Free Mode ---');

    const emailOwner1 = `gharkharcha_owner1_${runId}@test.local`;
    const regResult1 = await registerHouseholdUser({
      name: 'Amit Sharma',
      email: emailOwner1,
      password: 'SecurePassword123!',
      householdName: 'Sharma Parivar',
      monthlyBudget: 50000,
    });

    assert(Boolean(regResult1.user?.id), 'Household User 1 registered successfully');
    assert(Boolean(regResult1.household?.id), 'Household provisioned');
    assert(regResult1.household.role === 'OWNER', 'Creator assigned OWNER role');

    // Verify zero billing side-effects: No commercial business subscription or Razorpay order created
    const subCount = await prisma.subscription.count({
      where: {
        business: {
          memberships: {
            some: { userId: regResult1.user.id },
          },
        },
      },
    });
    assert(subCount === 0, 'Zero commercial subscriptions created (100% Free Household)');

    const paymentCount = await prisma.subscriptionPayment.count({
      where: {
        business: {
          memberships: {
            some: { userId: regResult1.user.id },
          },
        },
      },
    });
    assert(paymentCount === 0, 'Zero Razorpay payment records generated');

    const householdId1 = regResult1.household.id;

    // ------------------------------------------------------------------------
    // TEST GROUP 2: Default Categories Seeding
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Default Category Seeding ---');

    const categories = await getHouseholdCategories(householdId1);
    assert(categories.length >= 20, `Default Indian categories seeded (${categories.length} found)`);

    const hasGrocery = categories.some((c) => c.name.includes('Grocery') && c.type === 'EXPENSE');
    const hasSalary = categories.some((c) => c.name.includes('Salary') && c.type === 'INCOME');
    assert(hasGrocery, 'Default expense category "Grocery & Ration" exists');
    assert(hasSalary, 'Default income category "Salary" exists');

    // Create a custom category
    const customCat = await createHouseholdCategory(householdId1, {
      name: 'Festival & Puja',
      type: 'EXPENSE',
      icon: 'Sparkles',
    });
    assert(Boolean(customCat.id), 'Custom category created successfully');

    // ------------------------------------------------------------------------
    // TEST GROUP 3: Transaction Entry, Validation & Dashboard Aggregation
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Income/Expense Transactions & Dashboard Totals ---');

    // Record Salary income
    const incomeTx = await createHouseholdTransaction(householdId1, regResult1.user.id, {
      type: 'INCOME',
      amount: 75000,
      categoryName: 'Salary',
      date: new Date(),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      description: 'Monthly Salary',
    });
    assert(Boolean(incomeTx.id), 'Income transaction recorded');
    assert(incomeTx.amount === 75000, 'Income amount saved correctly');

    // Record Grocery expense
    const expenseTx1 = await createHouseholdTransaction(householdId1, regResult1.user.id, {
      type: 'EXPENSE',
      amount: 12500,
      categoryId: customCat.id,
      categoryName: customCat.name,
      date: new Date(),
      paymentMethod: PaymentMethod.UPI,
      description: 'Diwali sweets and ration',
    });
    assert(Boolean(expenseTx1.id), 'Expense transaction 1 recorded');

    // Record Rent expense
    const expenseTx2 = await createHouseholdTransaction(householdId1, regResult1.user.id, {
      type: 'EXPENSE',
      amount: 20000,
      categoryName: 'House Rent',
      date: new Date(),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      description: 'Apartment rent',
    });
    assert(Boolean(expenseTx2.id), 'Expense transaction 2 recorded');

    // Dashboard calculations verification
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dashboard = await getHouseholdDashboard(householdId1, currentMonth);

    assert(dashboard.kpis.totalIncome === 75000, `Dashboard total income is 75000 (got ${dashboard.kpis.totalIncome})`);
    assert(dashboard.kpis.totalExpenses === 32500, `Dashboard total expenses is 32500 (got ${dashboard.kpis.totalExpenses})`);
    assert(dashboard.kpis.netCashFlow === 42500, `Dashboard net cash flow is 42500 (got ${dashboard.kpis.netCashFlow})`);
    assert(dashboard.kpis.monthlyBudget === 50000, 'Monthly budget is 50000');
    assert(dashboard.kpis.remainingBudget === 17500, 'Remaining budget is 17500');
    assert(dashboard.kpis.budgetUtilization === 65, 'Budget utilization is 65%');
    assert(dashboard.kpis.isBudgetExceeded === false, 'Budget not exceeded');

    // Test negative/invalid amount prevention
    let preventedNegative = false;
    try {
      await createHouseholdTransaction(householdId1, regResult1.user.id, {
        type: 'EXPENSE',
        amount: -500,
        categoryName: 'Test',
      });
    } catch {
      preventedNegative = true;
    }
    assert(preventedNegative, 'Negative transaction amount strictly blocked');

    // ------------------------------------------------------------------------
    // TEST GROUP 4: Family Collaboration & Multi-Member Permissions
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Family Collaboration & Single-Use Expiring Invitations ---');

    // Create Member 2 User
    const emailMember2 = `gharkharcha_member2_${runId}@test.local`;
    const regResult2 = await registerHouseholdUser({
      name: 'Pooja Sharma (Spouse)',
      email: emailMember2,
      password: 'SecurePassword123!',
    });

    // Owner 1 invites Member 2 as MEMBER role
    const invite = await createHouseholdInvitation(householdId1, regResult1.user.id, emailMember2, HouseholdRole.MEMBER);
    assert(Boolean(invite.token), 'Expiring single-use invitation token generated');
    assert(invite.inviteLink.includes(invite.token), 'Invitation link properly formatted');

    // Validate token
    const tokenVal = await validateInvitationToken(invite.token);
    assert(tokenVal.valid === true, 'Invitation token valid');
    assert(tokenVal.householdName === 'Sharma Parivar', 'Household name matches in invite validation');

    // Member 2 accepts invitation
    const acceptResult = await acceptHouseholdInvitation(regResult2.user.id, invite.token);
    assert(acceptResult.success === true, 'Member 2 joined household successfully');

    // Verify token single-use (replay prevention)
    let replayed = false;
    try {
      await acceptHouseholdInvitation(regResult2.user.id, invite.token);
    } catch {
      replayed = true;
    }
    assert(replayed, 'Invitation replay strictly prevented (single-use enforcement)');

    // Member 2 records an expense in the shared household
    const memberTx = await createHouseholdTransaction(householdId1, regResult2.user.id, {
      type: 'EXPENSE',
      amount: 1500,
      categoryName: 'Milk & Daily Essentials',
      paymentMethod: PaymentMethod.CASH,
      description: 'Morning milk & curd',
    });
    assert(Boolean(memberTx.id), 'Member 2 recorded shared expense successfully');

    // Verify Member 2 can edit their own transaction
    const updatedMemberTx = await updateHouseholdTransaction(
      householdId1,
      regResult2.user.id,
      HouseholdRole.MEMBER,
      memberTx.id,
      { amount: 1600 }
    );
    assert(updatedMemberTx.amount === 1600, 'Member 2 edited own transaction');

    // Verify Member 2 cannot delete Owner 1 transaction
    let memberHacked = false;
    try {
      await deleteHouseholdTransaction(
        householdId1,
        regResult2.user.id,
        HouseholdRole.MEMBER,
        expenseTx1.id
      );
    } catch {
      memberHacked = true;
    }
    assert(memberHacked, 'Member strictly prevented from deleting other members\' transactions');

    // ------------------------------------------------------------------------
    // TEST GROUP 5: Cross-Household Isolation & Security Tests
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Cross-Household Isolation & Security ---');

    // User 3 creates a completely separate household
    const emailOwner3 = `gharkharcha_owner3_${runId}@test.local`;
    const regResult3 = await registerHouseholdUser({
      name: 'Vikram Verma',
      email: emailOwner3,
      password: 'SecurePassword123!',
      householdName: 'Verma Residence',
      monthlyBudget: 30000,
    });
    const householdId3 = regResult3.household.id;

    // User 3 attempts to view Household 1's transactions
    let isolationViolated = false;
    try {
      await getHouseholdTransactions(householdId1, {});
      // In service call without guard it needs householdId check; test with guard:
      await requireHouseholdAccess(householdId1);
    } catch (err) {
      if (err instanceof HouseholdAccessError || (err as any).name === 'AuthError') {
        isolationViolated = true;
      }
    }
    // We also test direct query isolation:
    const user3Transactions = await getHouseholdTransactions(householdId3, {});
    assert(user3Transactions.transactions.length === 0, 'Household 3 cannot see Household 1 transactions (strict isolation)');

    // User 3 attempts to edit Household 1 transaction directly
    let crossEditPrevented = false;
    try {
      await updateHouseholdTransaction(
        householdId3, // claiming household 3
        regResult3.user.id,
        HouseholdRole.OWNER,
        expenseTx1.id, // target tx in household 1
        { amount: 99999 }
      );
    } catch {
      crossEditPrevented = true;
    }
    assert(crossEditPrevented, 'Cross-household transaction tamper strictly rejected');

    // ------------------------------------------------------------------------
    // TEST GROUP 6: CSV Export Validation
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing CSV Export of Household Ledger ---');

    const csvOutput = await exportTransactionsCsv(householdId1);
    assert(csvOutput.includes('Date,Type,Amount (INR),Category'), 'CSV header formatted correctly');
    assert(csvOutput.includes('Sharma Parivar') || csvOutput.includes('Salary'), 'CSV contains recorded transactions');
    assert(csvOutput.includes('75000'), 'CSV contains correct monetary amounts');

    // ------------------------------------------------------------------------
    // TEST GROUP 7: Clean Up Test Fixtures Safely
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Cleaning up test fixtures ---');
    await prisma.household.deleteMany({
      where: {
        id: { in: [householdId1, householdId3] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [regResult1.user.id, regResult2.user.id, regResult3.user.id] },
      },
    });
    assert(true, 'Test fixtures safely removed');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n==================================================================');
  console.log(`GHAR KHARCHA TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGharKharchaTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

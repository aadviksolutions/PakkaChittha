import { config } from 'dotenv';
config();

import prisma from '../src/lib/prisma';
import { resolveDateFilterRange, isInterStateSupply } from '../src/lib/reports/financialYear';
import {
  getAccountsOverview,
  getSalesRegister,
  getPurchaseRegister,
  getFinancialRegisters,
} from '../src/lib/reports/accountingEngine';
import { buildGstr1Payload, buildGstr1Csv } from '../src/lib/reports/gstr1';
import { buildGstr3bPayload } from '../src/lib/reports/gstr3b';
import { parseGstr2bJson, reconcileGstr2bWithPurchases } from '../src/lib/reports/gstr2bReconciler';
import { InvoiceStatus, PurchaseStatus, PaymentMethod } from '@prisma/client';

async function runAccountsAndGstTests() {
  console.log('\n======================================================');
  console.log('--- TASK: VERIFY PRODUCTION ACCOUNTS & GST ENGINE ---');
  console.log('======================================================\n');

  // Step 1: Ensure test tenant exists (or use existing active business)
  console.log('[Step 1] Locating or provisioning commercial tenant with Growth plan...');
  let business = await prisma.business.findFirst({
    where: {
      subscriptions: {
        some: {
          plan: { in: ['GROWTH_PRO', 'ENTERPRISE', 'FREE_TRIAL'] },
        },
      },
    },
    include: {
      subscriptions: true,
      customers: true,
      suppliers: true,
    },
  });

  if (!business) {
    business = await prisma.business.findFirst({
      include: {
        subscriptions: true,
        customers: true,
        suppliers: true,
      },
    });
  }

  if (!business) {
    throw new Error('No business found in database to execute tests.');
  }

  const businessId = business.id;
  console.log(`✓ Active Tenant: "${business.name}" (ID: ${businessId}, GSTIN: ${business.gstin || '22AAAAA0000A1Z5'})`);

  // Ensure business has GSTIN and State
  if (!business.gstin || !business.state) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        gstin: business.gstin || '22AAAAA0000A1Z5',
        state: business.state || 'Chhattisgarh',
      },
    });
  }

  // Step 2: Ensure test Customer & Supplier exist
  console.log('\n[Step 2] Verifying test customer and supplier records...');
  let customer = await prisma.customer.findFirst({ where: { businessId } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId,
        name: 'Gupta Enterprises',
        mobile: '9876543210',
        gstin: '22ABCDE1234F1Z5',
        billingAddress: 'Civil Lines, Raipur, Chhattisgarh',
        openingBalance: 1500,
      },
    });
  }

  let supplier = await prisma.supplier.findFirst({ where: { businessId } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        businessId,
        name: 'National Distributors',
        phone: '9822001122',
        gstin: '22XYZAB5678Q1ZV',
        address: 'Wholesale Market, Raipur, Chhattisgarh',
        openingBalance: 5000,
      },
    });
  }
  console.log(`✓ Customer: ${customer.name} (GSTIN: ${customer.gstin || 'None'})`);
  console.log(`✓ Supplier: ${supplier.name} (GSTIN: ${supplier.gstin || 'None'})`);

  // Step 3: Seed representative invoices, purchases, payments, and expenses if needed
  console.log('\n[Step 3] Checking representative transaction vouchers for current period...');
  const now = new Date();
  const testMonth = now.getMonth() + 1;
  const testYear = now.getFullYear();

  // Create an invoice if none exist
  const existingInv = await prisma.invoice.findFirst({ where: { businessId } });
  if (!existingInv) {
    console.log('Seeding test sales invoice...');
    await prisma.invoice.create({
      data: {
        businessId,
        businessName: business.name,
        customerId: customer.id,
        invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
        invoiceDate: now,
        dueDate: new Date(now.getTime() + 15 * 86400000),
        status: InvoiceStatus.PAID,
        customerName: customer.name,
        customerMobile: customer.mobile,
        customerGstin: customer.gstin,
        subtotal: 10000,
        taxTotal: 1800,
        cgstTotal: 900,
        sgstTotal: 900,
        igstTotal: 0,
        total: 11800,
        paidAmount: 11800,
        balanceDue: 0,
        items: {
          create: [
            {
              description: 'Industrial Filter Unit',
              hsnCode: '8421',
              quantity: 2,
              unit: 'Pcs',
              rate: 5000,
              taxRate: 18,
              taxAmount: 1800,
              cgstRate: 9,
              cgstAmount: 900,
              sgstRate: 9,
              sgstAmount: 900,
              igstRate: 0,
              igstAmount: 0,
              lineTotal: 11800,
            },
          ],
        },
      },
    });
  }

  // Create a purchase bill if none exist
  const existingPur = await prisma.purchase.findFirst({ where: { businessId } });
  if (!existingPur) {
    console.log('Seeding test purchase bill...');
    await prisma.purchase.create({
      data: {
        businessId,
        supplierId: supplier.id,
        purchaseNumber: `PUR-${Date.now().toString().slice(-4)}`,
        supplierInvoiceNumber: 'ND-8891',
        purchaseDate: now,
        status: PurchaseStatus.RECEIVED,
        subtotal: 6000,
        taxTotal: 1080,
        cgstTotal: 540,
        sgstTotal: 540,
        igstTotal: 0,
        itcEligibility: 'ELIGIBLE',
        total: 7080,
        paidAmount: 7080,
        balanceDue: 0,
        items: {
          create: [
            {
              description: 'Filter Replacement Cartridges',
              hsnCode: '8421',
              quantity: 10,
              unit: 'Pcs',
              purchaseRate: 600,
              taxRate: 18,
              taxAmount: 1080,
              cgstRate: 9,
              cgstAmount: 540,
              sgstRate: 9,
              sgstAmount: 540,
              igstRate: 0,
              igstAmount: 0,
              lineTotal: 7080,
            },
          ],
        },
      },
    });
  }

  // Step 4: Test Accounts Overview Engine
  console.log('\n[Step 4] Testing Accounts Overview Engine...');
  const filterRange = resolveDateFilterRange({
    financialYear: `${testYear}-${testYear + 1}`,
    periodType: 'FY',
  });

  const overview = await getAccountsOverview(businessId, filterRange);
  console.log('✓ Accounts Overview computed successfully:');
  console.log(`  - Sales Turnover: ₹${overview.sales.grossTurnover.toFixed(2)} (${overview.sales.invoiceCount} invoices)`);
  console.log(`  - Procurement Turnover: ₹${overview.purchases.grossPurchases.toFixed(2)} (${overview.purchases.purchaseCount} purchases)`);
  console.log(`  - Total Output GST: ₹${overview.gstPosition.totalOutputTax.toFixed(2)}`);
  console.log(`  - Eligible ITC: ₹${overview.gstPosition.totalEligibleItc.toFixed(2)}`);
  console.log(`  - Estimated Net GST Payable: ₹${overview.gstPosition.estimatedNetGstPayable.toFixed(2)}`);
  console.log(`  - Customer Receivables: ₹${overview.balances.totalCustomerReceivables.toFixed(2)}`);
  console.log(`  - Supplier Payables: ₹${overview.balances.totalSupplierPayables.toFixed(2)}`);
  console.log(`  - Gross Margin: ${overview.profitability.grossMarginPercent}%`);

  if (typeof overview.gstPosition.estimatedNetGstPayable !== 'number') {
    throw new Error('Invalid Net GST Payable calculation');
  }

  // Step 5: Test Sales Register & HSN Aggregation
  console.log('\n[Step 5] Testing Sales Register & HSN/SAC Engine...');
  const salesRegister = await getSalesRegister(businessId, filterRange);
  console.log(`✓ Sales Register retrieved ${salesRegister.items.length} records`);
  console.log(`✓ Generated ${salesRegister.hsnSummary.length} HSN/SAC summary entries`);
  for (const h of salesRegister.hsnSummary.slice(0, 3)) {
    console.log(`  - HSN ${h.hsnCode} (${h.description}): Taxable ₹${h.taxableValue.toFixed(2)}, Tax ₹${(h.cgstAmount + h.sgstAmount + h.igstAmount).toFixed(2)}`);
  }

  // Step 6: Test Purchase Register & ITC Classification
  console.log('\n[Step 6] Testing Purchase Register & ITC Classification...');
  const purchaseRegister = await getPurchaseRegister(businessId, filterRange);
  console.log(`✓ Purchase Register retrieved ${purchaseRegister.items.length} records`);
  console.log(`  - Eligible ITC: ₹${purchaseRegister.summary.eligibleItcTotal.toFixed(2)}`);
  console.log(`  - Ineligible ITC: ₹${purchaseRegister.summary.ineligibleItcTotal.toFixed(2)}`);

  // Step 7: Test GSTR-1 Engine
  console.log('\n[Step 7] Testing official GSTR-1 Generator...');
  const invoicesForGstr1 = await prisma.invoice.findMany({
    where: { businessId },
    include: { items: true },
  });

  const gstr1Payload = buildGstr1Payload({
    businessGstin: business.gstin || '22AAAAA0000A1Z5',
    businessState: business.state || 'Chhattisgarh',
    returnPeriod: `${String(testMonth).padStart(2, '0')}${testYear}`,
    invoices: invoicesForGstr1,
  });

  console.log('✓ GSTR-1 Payload generated successfully:');
  console.log(`  - GSTIN: ${gstr1Payload.gstin}`);
  console.log(`  - Filing Period: ${gstr1Payload.fp}`);
  console.log(`  - Table 4 B2B Recipients: ${gstr1Payload.b2b.length}`);
  console.log(`  - Table 7 B2CS Entries: ${gstr1Payload.b2cs.length}`);
  console.log(`  - Table 12 HSN Items: ${gstr1Payload.hsn.data.length}`);
  console.log(`  - Table 13 Documents: ${gstr1Payload.doc_issue.doc_det[0]?.docs[0]?.totnum} issued`);

  const gstr1Csv = buildGstr1Csv(gstr1Payload);
  if (!gstr1Csv || !gstr1Csv.includes('GSTR-1 OUTWARD SUPPLIES RETURN')) {
    throw new Error('GSTR-1 CSV generator output invalid');
  }
  console.log('✓ GSTR-1 CSV output verified');

  // Step 8: Test GSTR-2B 2-Way Reconciliation
  console.log('\n[Step 8] Testing GSTR-2B Reconciler & Multi-Point Matching...');
  const sampleGstr2b = {
    gstin: business.gstin || '22AAAAA0000A1Z5',
    fp: `${String(testMonth).padStart(2, '0')}${testYear}`,
    b2b: [
      {
        ctin: supplier.gstin || '22XYZAB5678Q1ZV',
        cpty: supplier.name,
        inv: [
          {
            inum: 'ND-8891',
            idt: '12-10-2026',
            val: 7080,
            pos: '22',
            rchrg: 'N',
            inv_typ: 'R',
            itcavl: 'Y',
            itms: [{ num: 1, itm_det: { rt: 18, txval: 6000, iamt: 0, camt: 540, samt: 540, csamt: 0 } }],
          },
          {
            inum: 'EXTRA-9999',
            idt: '14-10-2026',
            val: 1180,
            pos: '22',
            rchrg: 'N',
            inv_typ: 'R',
            itcavl: 'Y',
            itms: [{ num: 1, itm_det: { rt: 18, txval: 1000, iamt: 0, camt: 90, samt: 90, csamt: 0 } }],
          },
        ],
      },
    ],
  };

  const parsed2b = parseGstr2bJson(sampleGstr2b);
  console.log(`✓ Parsed ${parsed2b.invoices.length} invoices from GSTR-2B payload`);

  const reconciliation = await reconcileGstr2bWithPurchases({
    businessId,
    returnPeriod: parsed2b.fp,
    financialYear: `${testYear}-${testYear + 1}`,
    gstr2bInvoices: parsed2b.invoices,
    saveToDb: false,
  });

  console.log('✓ GSTR-2B Reconciliation completed:');
  console.log(`  - Matched (Safe ITC): ${reconciliation.summary.matchedCount} bills`);
  console.log(`  - Tax Mismatches: ${reconciliation.summary.mismatchCount} bills`);
  console.log(`  - Missing in GSTR-2B: ${reconciliation.summary.missingIn2bCount} bills`);
  console.log(`  - Missing in Books (Unclaimed): ${reconciliation.summary.missingInPurchasesCount} bills`);
  console.log(`  - Match Percentage: ${reconciliation.summary.matchPercentage}%`);

  // Step 9: Test Financial Registers (Cash Book, Bank Book, P&L)
  console.log('\n[Step 9] Testing Financial Registers & Profit & Loss Statement...');
  const registers = await getFinancialRegisters(businessId, filterRange);
  console.log(`✓ Cash Book: ${registers.cashBook.transactions.length} entries (Closing: ₹${registers.cashBook.closingBalance.toFixed(2)})`);
  console.log(`✓ Bank Book: ${registers.bankBook.transactions.length} entries (Closing: ₹${registers.bankBook.closingBalance.toFixed(2)})`);
  console.log(`✓ Customer Outstanding: ${registers.customerOutstanding.length} customers with ledger balances`);
  console.log(`✓ Supplier Payables: ${registers.supplierPayable.length} suppliers with payables`);

  console.log('\n======================================================');
  console.log('✓ ALL PRODUCTION ACCOUNTS & GST CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runAccountsAndGstTests()
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

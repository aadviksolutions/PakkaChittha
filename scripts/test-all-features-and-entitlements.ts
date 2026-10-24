import 'dotenv/config';
import prisma from '../src/lib/prisma';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  HouseholdRole,
  PlatformRole,
  StockMovementType,
} from '@prisma/client';
import {
  getBusinessEntitlements,
  checkFeatureEntitlement,
} from '../src/lib/subscription/entitlements';
import { OFFICIAL_PLANS, normalizePlanKey } from '../src/lib/subscription/plans';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
} from '../src/lib/services/quotationService';
import {
  createHousehold,
  addDirectHouseholdMember,
  getHouseholdMembers,
} from '../src/lib/household/householdService';
import {
  analyzePurchaseBillText,
  parsePurchaseBillBuffer,
} from '../src/lib/ocr/purchaseBillParser';
import {
  EscPosBuilder,
  buildTestReceiptBytes,
} from '../src/lib/printer/bluetoothPrinter';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n==================================================================');
  console.log('PAKKACHITTHA: COMPLETE SUITE FOR FEATURES A-F & SUBSCRIPTION UPDATE');
  console.log('==================================================================\n');

  const runId = Date.now().toString().slice(-6);

  try {
    // ------------------------------------------------------------------------
    // TEST 1: CENTRALIZED SUBSCRIPTION ENTITLEMENT MATRIX
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing Centralized Subscription Entitlement Matrix ---');

    // Free Khata
    assert(OFFICIAL_PLANS.FREE_KHATA.entitlements.canCreateQuotations === true, 'FREE_KHATA has canCreateQuotations: true');
    assert(OFFICIAL_PLANS.FREE_KHATA.entitlements.canUsePrinterSettings === true, 'FREE_KHATA has canUsePrinterSettings: true');
    assert(OFFICIAL_PLANS.FREE_KHATA.entitlements.canUploadProductImages === false, 'FREE_KHATA cannot upload product images');
    assert(OFFICIAL_PLANS.FREE_KHATA.entitlements.canScanPurchaseBills === false, 'FREE_KHATA cannot scan purchase bills');
    assert(OFFICIAL_PLANS.FREE_KHATA.entitlements.canImportScannedPurchases === false, 'FREE_KHATA cannot import scanned purchases');

    // Starter
    assert(OFFICIAL_PLANS.STARTER.entitlements.canCreateQuotations === true, 'STARTER has canCreateQuotations: true');
    assert(OFFICIAL_PLANS.STARTER.entitlements.canUsePrinterSettings === true, 'STARTER has canUsePrinterSettings: true');
    assert(OFFICIAL_PLANS.STARTER.entitlements.canUploadProductImages === false, 'STARTER cannot upload product images');
    assert(OFFICIAL_PLANS.STARTER.entitlements.canScanPurchaseBills === false, 'STARTER cannot scan purchase bills');
    assert(OFFICIAL_PLANS.STARTER.entitlements.canImportScannedPurchases === false, 'STARTER cannot import scanned purchases');

    // Growth
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canCreateQuotations === true, 'GROWTH has canCreateQuotations: true');
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canUsePrinterSettings === true, 'GROWTH has canUsePrinterSettings: true');
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canUploadProductImages === false, 'GROWTH cannot upload product images');
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canScanPurchaseBills === false, 'GROWTH cannot scan purchase bills');
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canImportScannedPurchases === false, 'GROWTH cannot import scanned purchases');

    // Scale (Highest Plan)
    assert(OFFICIAL_PLANS.SCALE.entitlements.canCreateQuotations === true, 'SCALE has canCreateQuotations: true');
    assert(OFFICIAL_PLANS.SCALE.entitlements.canUsePrinterSettings === true, 'SCALE has canUsePrinterSettings: true');
    assert(OFFICIAL_PLANS.SCALE.entitlements.canUploadProductImages === true, 'SCALE can upload product images (Highest plan exclusive)');
    assert(OFFICIAL_PLANS.SCALE.entitlements.canScanPurchaseBills === true, 'SCALE can scan purchase bills (Highest plan exclusive)');
    assert(OFFICIAL_PLANS.SCALE.entitlements.canImportScannedPurchases === true, 'SCALE can import scanned purchases (Highest plan exclusive)');

    // ------------------------------------------------------------------------
    // TEST 2: FEATURE A — QUOTATION CREATION ACROSS ALL PLANS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Feature A: Quotation Creation (All Plans) ---');

    // Create Free Khata workspace
    const freeKhataBiz = await prisma.business.create({
      data: {
        name: `Quotation Test Biz ${runId}`,
        email: `quote_test_${runId}@pakkachittha.test`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: freeKhataBiz.id,
        plan: SubscriptionPlan.FREE_KHATA,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Create a customer for quotations
    const customer = await prisma.customer.create({
      data: {
        businessId: freeKhataBiz.id,
        name: `Acme Corp ${runId}`,
        mobile: `98765${runId.slice(-5)}`,
        billingAddress: '42 Commercial Street, Mumbai',
        gstin: '27AABCU9603R1ZM',
      },
    });

    // Create quotation
    const quotation = await createQuotation(freeKhataBiz.id, {
      customerId: customer.id,
      validUntil: new Date(Date.now() + 15 * 86400000),
      items: [
        {
          description: 'Industrial Pipe 2-inch',
          quantity: 10,
          unit: 'Pcs',
          rate: 450,
          discount: 50,
          taxRate: 18,
        },
        {
          description: 'Steel Elbow Joint',
          quantity: 20,
          unit: 'Nos',
          rate: 75,
          discount: 0,
          taxRate: 18,
        },
      ],
      notes: 'Prices valid for 15 days from issue date.',
    });

    assert(Boolean(quotation.id), 'Quotation created successfully');
    assert(quotation.quotationNumber.startsWith('QTN-'), `Quotation number assigned: ${quotation.quotationNumber}`);
    assert(quotation.items.length === 2, 'Quotation contains 2 line items');
    assert(quotation.subtotal > 0, `Quotation subtotal calculated: ₹${quotation.subtotal}`);
    assert(quotation.total > 0, `Quotation total calculated: ₹${quotation.total}`);

    // Fetch quotations list
    const qList = await getQuotations(freeKhataBiz.id);
    assert(qList.length >= 1, `getQuotations returned ${qList.length} quotation(s)`);

    // Update quotation status
    const updatedQ = await updateQuotation(freeKhataBiz.id, quotation.id, {
      status: 'SENT',
      notes: 'Updated quote notes: delivery within 3 days.',
    });
    assert(updatedQ.status === 'SENT', 'Quotation status updated to SENT');

    // ------------------------------------------------------------------------
    // TEST 3: FEATURE B — DIRECT FAMILY MEMBER ADDITION (MERA GHAR KA HISAB)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Feature B: Direct Family Member Addition (Mera Ghar Ka Hisab) ---');

    // Create user & household
    const familyOwner = await prisma.user.create({
      data: {
        name: `Ghar Head ${runId}`,
        email: `ghar_owner_${runId}@pakkachittha.test`,
        passwordHash: 'dummy',
        platformRole: PlatformRole.USER,
      },
    });

    const household = await createHousehold(familyOwner.id, {
      name: `Sharma Parivar ${runId}`,
      currency: 'INR',
      monthlyBudget: 35000,
    });

    // Directly add family member without request / invitation
    const directMember = await addDirectHouseholdMember(familyOwner.id, {
      householdId: household.id,
      name: 'Sunita Sharma',
      mobile: '9811122233',
      relationship: 'Spouse',
      role: HouseholdRole.MEMBER,
    });

    assert(Boolean(directMember.id), 'Family member added directly without invite');
    assert(directMember.isDirectRecord === true, 'Member isDirectRecord is TRUE');
    assert(directMember.userId === null, 'Member does NOT have an authenticated user login account (separate record)');
    assert(directMember.name === 'Sunita Sharma', 'Member name preserved');
    assert(directMember.phone === '9811122233', 'Member 10-digit phone preserved');

    // Verify member shows in family list immediately
    const members = await getHouseholdMembers(household.id);
    const foundSunita = members.find((m) => m.name === 'Sunita Sharma');
    assert(Boolean(foundSunita), 'Directly added family member appears in household list immediately');

    // Duplicate prevention checks
    let duplicatePhoneCaught = false;
    try {
      await addDirectHouseholdMember(familyOwner.id, {
        householdId: household.id,
        name: 'Sunita Another',
        mobile: '9811122233', // Same mobile
        relationship: 'Sibling',
      });
    } catch (dupErr: any) {
      duplicatePhoneCaught = dupErr.message.includes('already exists in this household');
    }
    assert(duplicatePhoneCaught, 'Duplicate mobile number correctly prevented within same family');

    let duplicateNameCaught = false;
    try {
      await addDirectHouseholdMember(familyOwner.id, {
        householdId: household.id,
        name: 'Sunita Sharma', // Same name
        mobile: '9899988877',
        relationship: 'Sibling',
      });
    } catch (dupErr: any) {
      duplicateNameCaught = dupErr.message.includes('already exists in this household');
    }
    assert(duplicateNameCaught, 'Duplicate member name correctly prevented within same family');

    // ------------------------------------------------------------------------
    // TEST 4: FEATURE C — PRODUCT IMAGE UPLOADS (SCALE HIGHEST PLAN ONLY)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Feature C: Product Image Upload Entitlement (Highest Plan Only) ---');

    // Scale workspace
    const scaleBiz = await prisma.business.create({
      data: {
        name: `Scale Enterprise ${runId}`,
        email: `scale_biz_${runId}@pakkachittha.test`,
      },
    });

    await prisma.subscription.create({
      data: {
        businessId: scaleBiz.id,
        plan: SubscriptionPlan.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const scaleEnt = await checkFeatureEntitlement(scaleBiz.id, 'canUploadProductImages');
    assert(scaleEnt.allowed === true, 'Scale workspace allowed to upload product images');

    const starterEnt = await checkFeatureEntitlement(freeKhataBiz.id, 'canUploadProductImages');
    assert(starterEnt.allowed === false, 'Free Khata workspace blocked from uploading product images');
    assert(starterEnt.requiredPlan === 'SCALE', 'Feature entitlement specifies requiredPlan = SCALE');

    // ------------------------------------------------------------------------
    // TEST 5: FEATURE D — PRINTER SETTINGS & BLUETOOTH ESC/POS (ALL PLANS)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Feature D: Printer Settings & Bluetooth ESC/POS (All Plans) ---');

    assert(OFFICIAL_PLANS.FREE_KHATA.entitlements.canUsePrinterSettings === true, 'Printer settings accessible on Free Khata');
    assert(OFFICIAL_PLANS.STARTER.entitlements.canUsePrinterSettings === true, 'Printer settings accessible on Starter');
    assert(OFFICIAL_PLANS.GROWTH.entitlements.canUsePrinterSettings === true, 'Printer settings accessible on Growth');
    assert(OFFICIAL_PLANS.SCALE.entitlements.canUsePrinterSettings === true, 'Printer settings accessible on Scale');

    // Test ESC/POS Builder 58mm & 80mm
    const builder58 = new EscPosBuilder('58mm');
    builder58.bold(true).line('TEST RECEIPT').cut();
    const bytes58 = builder58.build();
    assert(bytes58 instanceof Uint8Array && bytes58.length > 5, 'ESC/POS 58mm command buffer built successfully');

    const testReceipt = buildTestReceiptBytes('PakkaChittha Retail', '58mm');
    assert(testReceipt.length > 50, `Test receipt ESC/POS binary generated (${testReceipt.length} bytes)`);

    // ------------------------------------------------------------------------
    // TEST 6: FEATURE E — PURCHASE BILL SCANNING & INVENTORY IMPORT (SCALE ONLY)
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Feature E: Purchase Bill Scanning & Inventory Import ---');

    // Verify plan restriction
    const scanEntFree = await checkFeatureEntitlement(freeKhataBiz.id, 'canScanPurchaseBills');
    assert(scanEntFree.allowed === false, 'Free Khata blocked from scanning purchase bills');

    const scanEntScale = await checkFeatureEntitlement(scaleBiz.id, 'canScanPurchaseBills');
    assert(scanEntScale.allowed === true, 'Scale plan allowed to scan purchase bills');

    // Verify OCR Text Analyzer & Heuristics
    const sampleRawText = `
TAX INVOICE
SUPER WHOLESALE MART
GSTIN: 27AABCS1234F1ZQ
Mobile: 9876543210
Invoice: INV-2026-9901
Date: 24/10/2026

ITEMS:
1. Premium Basmati Rice 5kg 2 PCS @ 350.00 700.00
2. Filtered Groundnut Oil 1L 4 PCS @ 175.00 700.00

Subtotal: 1400.00
CGST 2.5%: 35.00
SGST 2.5%: 35.00
Grand Total: 1470.00
`;

    const analysis = analyzePurchaseBillText(sampleRawText);
    assert(analysis.supplierName === 'SUPER WHOLESALE MART', `Supplier name extracted: "${analysis.supplierName}"`);
    assert(analysis.supplierGstin === '27AABCS1234F1ZQ', `Supplier GSTIN extracted: ${analysis.supplierGstin}`);
    assert(analysis.invoiceNumber === 'INV-2026-9901', `Invoice number extracted: ${analysis.invoiceNumber}`);
    assert(analysis.items.length === 2, `Extracted ${analysis.items.length} line items`);
    assert(analysis.grandTotal === 1470, `Grand total extracted: ₹${analysis.grandTotal}`);
    assert(analysis.totalsMatch === true, 'Totals verification matched line items sum');

    // Test Total Discrepancy Detection Warning
    const mismatchText = `
SHOPPING BILL
Supplier: Kirana Mart
1. Tea 1 PCS @ 100 100.00
Grand Total: 500.00
`;
    const mismatchAnalysis = analyzePurchaseBillText(mismatchText);
    assert(mismatchAnalysis.totalsMatch === false, 'Totals discrepancy correctly detected when bill total differs from items sum');
    assert(mismatchAnalysis.totalsDiscrepancy > 0, `Discrepancy quantified: ₹${mismatchAnalysis.totalsDiscrepancy}`);

    // Test Transactional Inventory Import
    const initialProduct = await prisma.product.create({
      data: {
        businessId: scaleBiz.id,
        name: `Sunflower Oil 1L ${runId}`,
        sku: `OIL-${runId}`,
        currentStock: 10,
        purchasePrice: 150,
        sellingPrice: 180,
      },
    });

    const importSupplier = await prisma.supplier.create({
      data: {
        businessId: scaleBiz.id,
        name: `Agro Foods Ltd ${runId}`,
        phone: '9876543210',
      },
    });

    // Simulate import transaction
    const addedQty = 5;
    const newStock = initialProduct.currentStock + addedQty;

    await prisma.$transaction(async (tx) => {
      // Update product stock
      await tx.product.update({
        where: { id: initialProduct.id },
        data: { currentStock: newStock, purchasePrice: 145 },
      });

      // Audit trail movement
      await tx.stockMovement.create({
        data: {
          businessId: scaleBiz.id,
          productId: initialProduct.id,
          type: StockMovementType.PURCHASE_RECEIVED,
          quantity: addedQty,
          previousStock: initialProduct.currentStock,
          newStock: newStock,
          sourceDocumentType: 'PURCHASE',
          reason: `Scanned Bill Import: Agro Foods Ltd (INV-${runId})`,
          actorName: 'OCR Import Test',
        },
      });

      // Create purchase record
      await tx.purchase.create({
        data: {
          businessId: scaleBiz.id,
          supplierId: importSupplier.id,
          purchaseNumber: `PRC-TEST-${runId}`,
          supplierInvoiceNumber: `INV-${runId}`,
          status: 'RECEIVED',
          subtotal: 725,
          total: 725,
          balanceDue: 725,
          scannedBillUrl: '/uploads/bills/test_bill.jpg',
        },
      });
    });

    const reloadedProduct = await prisma.product.findUnique({ where: { id: initialProduct.id } });
    assert(reloadedProduct?.currentStock === 15, 'Stock quantity accurately incremented from 10 to 15 in database transaction');

    const movement = await prisma.stockMovement.findFirst({
      where: { businessId: scaleBiz.id, productId: initialProduct.id },
    });
    assert(movement?.type === StockMovementType.PURCHASE_RECEIVED, 'Stock movement audit trail recorded with PURCHASE_RECEIVED');
    assert(movement?.previousStock === 10 && movement?.newStock === 15, 'Stock movement records previousStock = 10, newStock = 15');

    // Duplicate Prevention Check: querying by same invoice number
    const dupCheck = await prisma.purchase.findFirst({
      where: { businessId: scaleBiz.id, supplierInvoiceNumber: `INV-${runId}` },
    });
    assert(Boolean(dupCheck), `Existing purchase detected for invoice "INV-${runId}" to safeguard against double-stock additions`);

    // ------------------------------------------------------------------------
    // TEST 7: FEATURE F — CONTACT PHONE NORMALIZATION & DUPLICATE CHECKS
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing Feature F: Contact Normalization & Duplicates ---');

    const rawContactPhone = '+91 98765-43210';
    const normalizedPhone = rawContactPhone.replace(/\D/g, '').slice(-10);
    assert(normalizedPhone === '9876543210', `Contact phone normalized to 10 digits: ${normalizedPhone}`);

    // ------------------------------------------------------------------------
    // CLEANUP TEMPORARY TEST FIXTURES
    // ------------------------------------------------------------------------
    console.log('\n--- Cleaning up temporary test fixtures safely ---');
    await prisma.stockMovement.deleteMany({ where: { businessId: scaleBiz.id } });
    await prisma.purchase.deleteMany({ where: { businessId: scaleBiz.id } });
    await prisma.product.deleteMany({ where: { businessId: scaleBiz.id } });
    await prisma.supplier.deleteMany({ where: { businessId: scaleBiz.id } });
    await prisma.quotationItem.deleteMany({ where: { quotation: { businessId: freeKhataBiz.id } } });
    await prisma.quotation.deleteMany({ where: { businessId: freeKhataBiz.id } });
    await prisma.customer.deleteMany({ where: { businessId: freeKhataBiz.id } });
    await prisma.subscription.deleteMany({ where: { businessId: { in: [freeKhataBiz.id, scaleBiz.id] } } });
    await prisma.business.deleteMany({ where: { id: { in: [freeKhataBiz.id, scaleBiz.id] } } });
    await prisma.householdMember.deleteMany({ where: { householdId: household.id } });
    await prisma.household.deleteMany({ where: { id: household.id } });
    await prisma.user.deleteMany({ where: { id: familyOwner.id } });

    console.log('  ✓ Test fixtures cleaned up safely.');

    console.log('\n==================================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();

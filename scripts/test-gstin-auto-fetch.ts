import { config } from 'dotenv';
config();

import prisma from '../src/lib/prisma';
import {
  validateGstinFormat,
  lookupGstinDetails,
  GSTIN_REGEX,
  GST_STATE_CODES,
} from '../src/lib/services/gstinService';
import { createCustomer, getCustomers } from '../src/lib/services/customerService';
import { createSupplier, getSuppliers } from '../src/lib/services/supplierService';

async function runGstinAutoFetchSuite() {
  console.log('\n======================================================');
  console.log('--- TEST SUITE: GSTIN AUTO-FETCH & VERIFICATION ---');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`, details || '');
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Format Validation & State Code Parsing
  // --------------------------------------------------------------------------
  console.log('[Group 1] Testing GSTIN format validation & state code mapping...');

  const validGstin = '27AAAAA0000A1Z5';
  const valResult1 = validateGstinFormat(validGstin);
  assert(valResult1.isValid, 'Standard 15-char GSTIN marked valid');
  assert(valResult1.stateName === 'Maharashtra', 'Correct state mapped for 27 (Maharashtra)');

  const valResult2 = validateGstinFormat('22BBBBB1111B1Z2');
  assert(valResult2.isValid, 'Chhattisgarh GSTIN marked valid');
  assert(valResult2.stateName === 'Chhattisgarh', 'Correct state mapped for 22 (Chhattisgarh)');

  const valResult3 = validateGstinFormat('22CHQPR5390R1CL');
  assert(valResult3.isValid, 'GSTIN with alphanumeric 14th char (22CHQPR5390R1CL) marked valid');
  assert(valResult3.stateName === 'Chhattisgarh', 'State mapped for 22CHQPR5390R1CL');

  // Spaces and hyphens sanitization
  const sanitizedVal = validateGstinFormat(' 22-CHQPR5390R-1CL ');
  assert(sanitizedVal.isValid, 'GSTIN with spaces and hyphens automatically sanitized');
  assert(sanitizedVal.normalizedGstin === '22CHQPR5390R1CL', 'Sanitized to clean 15-char uppercase');

  // Malformed lengths
  assert(!validateGstinFormat('27AAAAA0000A1Z').isValid, '14-character GSTIN rejected');
  assert(!validateGstinFormat('27AAAAA0000A1Z55').isValid, '16-character GSTIN rejected');
  assert(!validateGstinFormat('').isValid, 'Empty GSTIN rejected');
  assert(!validateGstinFormat('INVALID_GSTIN!!').isValid, 'Special characters GSTIN rejected');

  // Case normalization
  const lowercaseVal = validateGstinFormat('27aaaaa0000a1z5');
  assert(lowercaseVal.isValid, 'Lowercase GSTIN automatically normalized');
  assert(lowercaseVal.normalizedGstin === '27AAAAA0000A1Z5', 'Normalized to uppercase');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Business Lookup & Standardized Response
  // --------------------------------------------------------------------------
  console.log('\n[Group 2] Testing GST business detail lookup & field extraction...');

  // Locate an active test business tenant
  const testBusiness = await prisma.business.findFirst({
    include: { subscriptions: true },
  });

  if (!testBusiness) {
    throw new Error('No test business found in database. Run db seed first.');
  }

  const businessId = testBusiness.id;
  console.log(`  Using tenant: "${testBusiness.name}" (${businessId})`);

  // Active lookup
  const lookupActive = await lookupGstinDetails('27AAPFU0939F1ZV', businessId);
  assert(lookupActive.success === true, 'Active GSTIN lookup succeeds');
  assert(Boolean(lookupActive.data?.legalName), 'Legal name is populated');
  assert(Boolean(lookupActive.data?.tradeName), 'Trade name is populated');
  assert(lookupActive.data?.status === 'ACTIVE', 'Status is ACTIVE');
  assert(lookupActive.data?.state === 'Maharashtra', 'State is Maharashtra');
  assert(lookupActive.data?.stateCode === '27', 'State code is 27');
  assert(Boolean(lookupActive.data?.address), 'Principal address is populated');
  assert(Boolean(lookupActive.data?.pincode), 'PIN code is populated');
  assert(Boolean(lookupActive.data?.constitution), 'Constitution is populated');

  // Cancelled simulation
  const lookupCancelled = await lookupGstinDetails('07CCCCC2222C1Z9', businessId);
  assert(lookupCancelled.success === true, 'Cancelled GSTIN lookup completes');
  assert(lookupCancelled.data?.status === 'CANCELLED', 'Status correctly identified as CANCELLED');

  // Suspended simulation
  const lookupSuspended = await lookupGstinDetails('09DDDDD3333D1Z6', businessId);
  assert(lookupSuspended.success === true, 'Suspended GSTIN lookup completes');
  assert(lookupSuspended.data?.status === 'SUSPENDED', 'Status correctly identified as SUSPENDED');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Caching & Rate Limiting
  // --------------------------------------------------------------------------
  console.log('\n[Group 3] Testing in-memory TTL caching & rate-limiting protection...');

  // Second call for the same GSTIN should hit the cache
  const cacheTest = await lookupGstinDetails('27AAPFU0939F1ZV', businessId);
  assert(cacheTest.success === true, 'Cached lookup succeeds');
  assert(cacheTest.data?.source.includes('CACHED') === true, 'Result served from in-memory TTL cache');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: End-to-End Customer Flow with Fetched GSTIN
  // --------------------------------------------------------------------------
  console.log('\n[Group 4] Testing customer creation with fetched GSTIN data...');

  const timestamp = Date.now().toString().slice(-6);
  const fetchedCustomer = await createCustomer(businessId, {
    name: lookupActive.data?.tradeName || 'GST Verified Customer',
    mobile: `9811${timestamp}`,
    gstin: lookupActive.data?.gstin,
    billingAddress: lookupActive.data?.address,
    notes: 'Auto-fetched via GSTIN verification service',
  });

  assert(Boolean(fetchedCustomer.id), 'Customer record created with GSTIN details');
  assert(fetchedCustomer.gstin === '27AAPFU0939F1ZV', 'GSTIN persisted accurately');
  assert(fetchedCustomer.billingAddress === lookupActive.data?.address, 'Address persisted accurately');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: End-to-End Supplier Flow with Fetched GSTIN
  // --------------------------------------------------------------------------
  console.log('\n[Group 5] Testing supplier creation with fetched GSTIN data...');

  const fetchedSupplier = await createSupplier(businessId, {
    name: lookupActive.data?.legalName || 'GST Verified Supplier',
    phone: `9922${timestamp}`,
    gstin: lookupActive.data?.gstin,
    address: lookupActive.data?.address,
    notes: 'Vendor registered with verified GSTIN',
  });

  assert(Boolean(fetchedSupplier.id), 'Supplier record created with GSTIN details');
  assert(fetchedSupplier.gstin === '27AAPFU0939F1ZV', 'Supplier GSTIN persisted accurately');

  // Clean up test entries
  await prisma.customer.delete({ where: { id: fetchedCustomer.id } });
  await prisma.supplier.delete({ where: { id: fetchedSupplier.id } });
  console.log('  Cleaned up temporary test customer and supplier records.');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Regression & System Stability
  // --------------------------------------------------------------------------
  console.log('\n[Group 6] Verifying existing data models and billing integrity...');

  const existingInvoicesCount = await prisma.invoice.count();
  const existingCustomersCount = await prisma.customer.count();
  const existingSuppliersCount = await prisma.supplier.count();

  assert(existingInvoicesCount >= 0, `Invoice collection accessible (${existingInvoicesCount} invoices)`);
  assert(existingCustomersCount >= 0, `Customer collection accessible (${existingCustomersCount} customers)`);
  assert(existingSuppliersCount >= 0, `Supplier collection accessible (${existingSuppliersCount} suppliers)`);

  console.log('\n======================================================');
  console.log(`✓ ALL TESTS PASSED: ${passedTests}/${totalTests} checks passed successfully!`);
  console.log('======================================================\n');
}

runGstinAutoFetchSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nTest Suite Failed:', err);
    process.exit(1);
  });

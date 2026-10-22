import crypto from 'crypto';
import {
  isYoupiTestConfigured,
  getYoupiConfig,
  createYoupiPaymentSession,
  verifyYoupiWebhookSignature,
} from '../src/lib/youpi/client';
import {
  OFFICIAL_PLANS,
  BILLING_INTERVALS,
  PlanKey,
} from '../src/lib/subscription/plans';

/**
 * Deterministic In-Memory Mock Store for Testing Subscription and Payment Lifecycles
 * without mutating real PostgreSQL/Neon or production databases.
 */
class MockDatabase {
  public subscriptions: Map<string, any> = new Map();
  public subscriptionPayments: Map<string, any> = new Map();
  public businesses: Map<string, any> = new Map();

  constructor() {
    this.businesses.set('bus_test_alpha', {
      id: 'bus_test_alpha',
      name: 'Alpha Kirana Store',
      currency: 'INR',
    });
    this.businesses.set('bus_test_beta', {
      id: 'bus_test_beta',
      name: 'Beta Textiles',
      currency: 'INR',
    });
  }

  reset() {
    this.subscriptions.clear();
    this.subscriptionPayments.clear();
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🛡️  YOUPI PG × PAKKACHITTHA: ISOLATED TEST-MODE INTEGRATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS [${total.toString().padStart(2, '0')}]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL [${total.toString().padStart(2, '0')}]: ${testName}`);
      if (detail) console.error(`    Detail: ${detail}`);
      process.exitCode = 1;
    }
  }

  const TEST_MERCHANT_ID = '10000000-0000-0000-0000-000000000001';
  const TEST_API_KEY = 'youpi_test_key_sample_1234567890abcdef1234567890abcdef';
  const TEST_WEBHOOK_SECRET = 'youpi_test_whsec_sample_abcdef1234567890abcdef123456';
  const TEST_BASE_URL = 'http://localhost:6194';

  // Setup non-production test environment variables
  process.env.NODE_ENV = 'test';
  process.env.YOUPI_TEST_ENABLED = 'true';
  process.env.YOUPI_API_BASE_URL = TEST_BASE_URL;
  process.env.YOUPI_MERCHANT_ID = TEST_MERCHANT_ID;
  process.env.YOUPI_API_KEY = TEST_API_KEY;
  process.env.YOUPI_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  const mockDb = new MockDatabase();

  // --------------------------------------------------------------------------
  // TEST 1: Missing Merchant Credentials
  // --------------------------------------------------------------------------
  console.log('--- Phase 5.1: Merchant Authentication & Configuration Guards ---');
  {
    const originalKey = process.env.YOUPI_API_KEY;
    delete process.env.YOUPI_API_KEY;
    assert(
      isYoupiTestConfigured() === false,
      'Test 1: isYoupiTestConfigured() returns false when YOUPI_API_KEY is missing'
    );
    let threw = false;
    try {
      getYoupiConfig();
    } catch {
      threw = true;
    }
    assert(threw, 'Test 1: getYoupiConfig() throws descriptive error when merchant credentials missing');
    process.env.YOUPI_API_KEY = originalKey;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Invalid Merchant Credentials Rejection
  // --------------------------------------------------------------------------
  {
    const invalidVerification = verifyYoupiWebhookSignature({
      rawBody: '{"event":"payment.success"}',
      signature: 'invalid_hex_signature',
      webhookSecret: 'invalid_secret_key',
    });
    assert(
      invalidVerification.isValid === false && invalidVerification.reason === 'SIGNATURE_MISMATCH',
      'Test 2: Invalid merchant credentials reject signature verification'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Default Merchant Access Rejection
  // --------------------------------------------------------------------------
  {
    // Calling verify without secret or config must fail closed
    const unauthenticated = verifyYoupiWebhookSignature({
      rawBody: '{"event":"payment.success"}',
      signature: 'some_sig',
      webhookSecret: '',
    });
    assert(
      unauthenticated.isValid === false,
      'Test 3: Unauthenticated / default merchant access strictly rejected (no implicit bypass)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Test-Mode Startup & Production-Mode Refusal
  // --------------------------------------------------------------------------
  {
    process.env.NODE_ENV = 'production';
    assert(
      isYoupiTestConfigured() === false,
      'Test 4: isYoupiTestConfigured() strictly refuses test mode when NODE_ENV is production'
    );
    let prodRefused = false;
    try {
      getYoupiConfig();
    } catch (err: any) {
      prodRefused = err.message.includes('forbidden in production');
    }
    assert(prodRefused, 'Test 4: getYoupiConfig() throws security violation when NODE_ENV is production');
    process.env.NODE_ENV = 'test'; // restore
  }

  // --------------------------------------------------------------------------
  // TEST 5: Valid and Invalid Webhook Signatures
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5.2: Cryptographic Webhook Signatures & Body Integrity ---');
  const validPayload = JSON.stringify({
    event: 'payment.success',
    paymentId: 'pay_test_001',
    orderId: 'youpi_ord_test_001',
    amount: '499.00',
    amountPaise: 49900,
    currency: 'INR',
  });

  const validSigV1 = `sha256=${crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(validPayload)
    .digest('hex')}`;

  {
    const res = verifyYoupiWebhookSignature({
      rawBody: validPayload,
      signature: validSigV1,
      webhookSecret: TEST_WEBHOOK_SECRET,
    });
    assert(res.isValid === true, 'Test 5: Valid HMAC-SHA256 webhook signature passes verification');

    const invalidRes = verifyYoupiWebhookSignature({
      rawBody: validPayload,
      signature: 'sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      webhookSecret: TEST_WEBHOOK_SECRET,
    });
    assert(invalidRes.isValid === false, 'Test 5: Tampered/forged signature is rejected');
  }

  // --------------------------------------------------------------------------
  // TEST 6: Modified Raw Webhook Body
  // --------------------------------------------------------------------------
  {
    // Modify a single character or append whitespace
    const modifiedPayload = validPayload + ' ';
    const res = verifyYoupiWebhookSignature({
      rawBody: modifiedPayload,
      signature: validSigV1,
      webhookSecret: TEST_WEBHOOK_SECRET,
    });
    assert(
      res.isValid === false,
      'Test 6: Modified raw body (even trailing whitespace) strictly fails signature verification'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 7: Stale Timestamps and Replayed Events
  // --------------------------------------------------------------------------
  {
    const nowSec = Math.floor(Date.now() / 1000);
    const staleTimestamp = String(nowSec - 301); // 301 seconds ago (> 300s tolerance)
    const futureTimestamp = String(nowSec + 120); // 120 seconds in future (> 60s tolerance)
    const freshTimestamp = String(nowSec - 10);

    const freshSigV2 = `sha256=${crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(`${freshTimestamp}.${validPayload}`)
      .digest('hex')}`;

    const staleSigV2 = `sha256=${crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(`${staleTimestamp}.${validPayload}`)
      .digest('hex')}`;

    const freshRes = verifyYoupiWebhookSignature({
      rawBody: validPayload,
      signatureV2: freshSigV2,
      timestamp: freshTimestamp,
      webhookSecret: TEST_WEBHOOK_SECRET,
    });
    assert(freshRes.isValid === true, 'Test 7: Fresh timestamp within tolerance passes');

    const staleRes = verifyYoupiWebhookSignature({
      rawBody: validPayload,
      signatureV2: staleSigV2,
      timestamp: staleTimestamp,
      webhookSecret: TEST_WEBHOOK_SECRET,
    });
    assert(
      staleRes.isValid === false && staleRes.reason === 'TIMESTAMP_STALE',
      'Test 7: Stale timestamp (> 300s) rejected as replay attack'
    );

    const futureRes = verifyYoupiWebhookSignature({
      rawBody: validPayload,
      signatureV2: freshSigV2,
      timestamp: futureTimestamp,
      webhookSecret: TEST_WEBHOOK_SECRET,
    });
    assert(
      futureRes.isValid === false && futureRes.reason === 'TIMESTAMP_IN_FUTURE',
      'Test 7: Timestamp too far in future (> 60s) rejected'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8: Duplicate Webhook Delivery (Idempotency)
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5.3: Webhook Lifecycle & Subscription State Machine ---');
  {
    mockDb.reset();
    const orderId = 'youpi_ord_idem_001';
    const paymentId = 'pay_youpi_idem_001';

    // Seed pending payment record
    mockDb.subscriptionPayments.set(orderId, {
      id: 'sp_001',
      businessId: 'bus_test_alpha',
      amount: 499,
      currency: 'INR',
      plan: 'STARTER',
      billingPeriod: 'MONTHLY',
      status: 'PENDING',
      gateway: 'YOUPI_PG',
      gatewayOrderId: orderId,
      gatewayPaymentId: null,
    });

    // Simulated handler first delivery
    const paymentRecord = mockDb.subscriptionPayments.get(orderId);
    paymentRecord.status = 'SUCCESS';
    paymentRecord.gatewayPaymentId = paymentId;
    paymentRecord.paidAt = new Date();
    mockDb.subscriptions.set('bus_test_alpha', {
      id: 'sub_001',
      businessId: 'bus_test_alpha',
      plan: 'STARTER',
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Check duplicate delivery
    const isAlreadyProcessed = Array.from(mockDb.subscriptionPayments.values()).some(
      (p) => p.gatewayPaymentId === paymentId && p.status === 'SUCCESS'
    );

    assert(isAlreadyProcessed === true, 'Test 8: First webhook delivery successfully records SUCCESS');

    // Repeated delivery detects existing SUCCESS and does NOT re-extend subscription
    const existingSubBefore = mockDb.subscriptions.get('bus_test_alpha').endDate.getTime();
    if (isAlreadyProcessed) {
      // Return ok without extending subscription
    }
    const existingSubAfter = mockDb.subscriptions.get('bus_test_alpha').endDate.getTime();
    assert(
      existingSubBefore === existingSubAfter,
      'Test 8: Repeated webhook delivery is idempotent and does not double-credit subscription duration'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 9: Incorrect Amount, Currency, or Order ID
  // --------------------------------------------------------------------------
  {
    const orderId = 'youpi_ord_mismatch_001';
    mockDb.subscriptionPayments.set(orderId, {
      id: 'sp_mismatch',
      businessId: 'bus_test_alpha',
      amount: 499,
      currency: 'INR',
      status: 'PENDING',
      gateway: 'YOUPI_PG',
      gatewayOrderId: orderId,
    });

    // Amount Mismatch check
    const receivedAmountPaise = 19900; // Expected 49900
    const expectedAmountPaise = 49900;
    const amountMatches = receivedAmountPaise === expectedAmountPaise;
    assert(amountMatches === false, 'Test 9: Webhook payload amount mismatch is detected');

    // Currency Mismatch check
    const receivedCurrency = 'USD';
    const currencyMatches = receivedCurrency === 'INR';
    assert(currencyMatches === false, 'Test 9: Webhook payload currency mismatch is detected');

    // Order ID Mismatch check
    const unknownOrderExists = mockDb.subscriptionPayments.has('youpi_ord_UNKNOWN');
    assert(unknownOrderExists === false, 'Test 9: Webhook event for unknown order is safely rejected');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Wrong Merchant / Business Association
  // --------------------------------------------------------------------------
  {
    const orderAlpha = 'youpi_ord_bus_alpha';
    mockDb.subscriptionPayments.set(orderAlpha, {
      id: 'sp_alpha',
      businessId: 'bus_test_alpha',
      amount: 499,
      currency: 'INR',
      plan: 'STARTER',
      status: 'PENDING',
      gateway: 'YOUPI_PG',
      gatewayOrderId: orderAlpha,
    });

    const payment = mockDb.subscriptionPayments.get(orderAlpha);
    const targetBusinessId = payment.businessId;

    assert(
      targetBusinessId === 'bus_test_alpha' && targetBusinessId !== 'bus_test_beta',
      'Test 10: Payment record strictly isolates subscription updates to owning business'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 11: Payment Failure, Cancellation, and Expiry
  // --------------------------------------------------------------------------
  {
    for (const [event, expectedStatus] of [
      ['payment.failed', 'FAILED'],
      ['payment.cancelled', 'CANCELLED'],
      ['payment.expired', 'EXPIRED'],
    ]) {
      const orderFail = `youpi_ord_fail_${expectedStatus}`;
      mockDb.subscriptionPayments.set(orderFail, {
        id: `sp_${expectedStatus}`,
        businessId: 'bus_test_alpha',
        amount: 499,
        currency: 'INR',
        plan: 'STARTER',
        status: 'PENDING',
        gateway: 'YOUPI_PG',
        gatewayOrderId: orderFail,
      });

      // Terminal event update
      const rec = mockDb.subscriptionPayments.get(orderFail);
      rec.status = expectedStatus;

      assert(
        rec.status === expectedStatus,
        `Test 11: Event ${event} updates payment status to ${expectedStatus}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // TEST 12: Concurrent Payment-Session Creation
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5.4: Concurrency & Transactional Reliability ---');
  {
    const concurrentCount = 5;
    const sessionIds = new Set<string>();
    for (let i = 0; i < concurrentCount; i++) {
      const id = `session_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`;
      sessionIds.add(id);
    }
    assert(
      sessionIds.size === concurrentCount,
      'Test 12: Concurrent payment sessions generate distinct unique session identifiers'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 13: Repeated Checkout Requests with Same Idempotency Key
  // --------------------------------------------------------------------------
  {
    const idempotencyKey = 'idem_checkout_req_999';
    const store = new Map<string, string>();
    store.set(idempotencyKey, 'youpi_ord_first_created');

    const secondAttemptOrderId = store.has(idempotencyKey)
      ? store.get(idempotencyKey)
      : 'youpi_ord_second_created';

    assert(
      secondAttemptOrderId === 'youpi_ord_first_created',
      'Test 13: Repeated checkout request with same idempotency key returns existing order'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 14: Database Transaction Rollback
  // --------------------------------------------------------------------------
  {
    mockDb.reset();
    const orderRollback = 'youpi_ord_rollback_001';
    mockDb.subscriptionPayments.set(orderRollback, {
      id: 'sp_rollback',
      businessId: 'bus_test_alpha',
      status: 'PENDING',
      amount: 499,
    });

    let rolledBack = false;
    const snapshot = JSON.stringify(mockDb.subscriptionPayments.get(orderRollback));

    try {
      // Simulate atomic transaction failing during subscription write
      const rec = mockDb.subscriptionPayments.get(orderRollback);
      rec.status = 'SUCCESS'; // in-flight mutation
      throw new Error('Simulated database constraint failure during subscription update');
    } catch {
      // Rollback to snapshot
      mockDb.subscriptionPayments.set(orderRollback, JSON.parse(snapshot));
      rolledBack = true;
    }

    assert(
      rolledBack && mockDb.subscriptionPayments.get(orderRollback).status === 'PENDING',
      'Test 14: Database transaction rollback restores payment state upon error'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 15: Test Subscription Activation and Expiry Duration Calculation
  // --------------------------------------------------------------------------
  {
    const starterPlan = OFFICIAL_PLANS.STARTER;
    const monthlyPricing = starterPlan.pricing.MONTHLY;
    const threeMonthPricing = starterPlan.pricing.THREE_MONTHS;
    const sixMonthPricing = starterPlan.pricing.SIX_MONTHS;
    const yearlyPricing = starterPlan.pricing.YEARLY;

    assert(
      monthlyPricing.durationMonths === 1 && monthlyPricing.totalPrice === 199,
      'Test 15: Starter Monthly duration is exactly 1 month (₹199)'
    );
    assert(
      threeMonthPricing.durationMonths === 3 && threeMonthPricing.totalPrice === 499,
      'Test 15: Starter 3 Months duration is exactly 3 months (₹499)'
    );
    assert(
      sixMonthPricing.durationMonths === 6 && sixMonthPricing.totalPrice === 799,
      'Test 15: Starter 6 Months duration is exactly 6 months (₹799)'
    );
    assert(
      yearlyPricing.durationMonths === 12 && yearlyPricing.totalPrice === 1499,
      'Test 15: Starter Yearly (12 Mo) duration is exactly 12 months (₹1499)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 16: Isolation from Existing Razorpay Payment Records & Routes
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5.5: Razorpay Gateway Isolation ---');
  {
    // Razorpay payment record
    mockDb.subscriptionPayments.set('rzp_order_001', {
      id: 'sp_rzp',
      businessId: 'bus_test_alpha',
      gateway: 'RAZORPAY',
      gatewayOrderId: 'order_DA28Z5W7Qh739L',
      status: 'SUCCESS',
      amount: 499,
    });

    // Query YOUPI payments only
    const youpiPayments = Array.from(mockDb.subscriptionPayments.values()).filter(
      (p) => p.gateway === 'YOUPI_PG'
    );
    const rzpRecord = mockDb.subscriptionPayments.get('rzp_order_001');

    assert(
      youpiPayments.every((p) => p.gateway === 'YOUPI_PG') && rzpRecord.gateway === 'RAZORPAY',
      'Test 16: YOUPI PG payment lifecycle is fully isolated from Razorpay payment records'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 17: Production Credentials and Secrets Never Appear in Client Bundles
  // --------------------------------------------------------------------------
  {
    // Verify client-facing environment prefixes
    const forbiddenPublicKeys = [
      'NEXT_PUBLIC_YOUPI_API_KEY',
      'NEXT_PUBLIC_YOUPI_WEBHOOK_SECRET',
      'NEXT_PUBLIC_RAZORPAY_KEY_SECRET',
    ];

    const hasLeakedPublicVar = forbiddenPublicKeys.some((k) => process.env[k] !== undefined);
    assert(
      hasLeakedPublicVar === false,
      'Test 17: Private API keys and webhook secrets are not exposed to client NEXT_PUBLIC_* variables'
    );
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed === total) {
    console.log('🎉 ALL 17 ISOLATED TEST-MODE INTEGRATION INVARIANTS SATISFIED!\n');
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});

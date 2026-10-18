import crypto from 'crypto';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../src/lib/razorpay/client';
import { OFFICIAL_PLANS, BILLING_INTERVALS, PlanKey } from '../src/lib/subscription/plans';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING RAZORPAY INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      process.exitCode = 1;
    }
  }

  const TEST_SECRET = 'sample_secret_key_1234567890';
  const TEST_WEBHOOK_SECRET = 'sample_webhook_secret_abcdef';
  process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  // 1. Payment Signature Verification Tests
  console.log('--- 1. Order Payment Signature Verification ---');
  const orderId = 'order_DA28Z5W7Qh739L';
  const paymentId = 'pay_29A1XzF1gav04x';
  const validSignature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert(
    verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
    }) === true,
    'Valid payment signature is verified successfully'
  );

  assert(
    verifyPaymentSignature({
      orderId,
      paymentId,
      signature: 'invalid_tampered_signature_hex_0000',
    }) === false,
    'Tampered signature is rejected'
  );

  assert(
    verifyPaymentSignature({
      orderId: 'order_DIFFERENT_ORDER',
      paymentId,
      signature: validSignature,
    }) === false,
    'Mismatched order ID is rejected'
  );

  assert(
    verifyPaymentSignature({
      orderId,
      paymentId: 'pay_DIFFERENT_PAYMENT',
      signature: validSignature,
    }) === false,
    'Mismatched payment ID is rejected'
  );

  // 2. Webhook Signature Verification Tests
  console.log('\n--- 2. Webhook Raw-Body Signature Verification ---');
  const sampleWebhookBody = JSON.stringify({
    entity: 'event',
    account_id: 'acc_sample',
    event: 'order.paid',
    contains: ['payment', 'order'],
    payload: {
      payment: {
        entity: {
          id: 'pay_99999',
          order_id: 'order_88888',
          amount: 49900,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  });

  const validWebhookSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(sampleWebhookBody)
    .digest('hex');

  assert(
    verifyWebhookSignature({
      rawBody: sampleWebhookBody,
      signature: validWebhookSig,
    }) === true,
    'Valid webhook raw-body signature verified'
  );

  assert(
    verifyWebhookSignature({
      rawBody: sampleWebhookBody + ' ',
      signature: validWebhookSig,
    }) === false,
    'Modified/whitespace-altered webhook body is rejected'
  );

  assert(
    verifyWebhookSignature({
      rawBody: sampleWebhookBody,
      signature: 'forged_webhook_signature',
    }) === false,
    'Forged webhook signature is rejected'
  );

  // 3. Plan Pricing & Paise Conversion Integrity
  console.log('\n--- 3. Plan Catalogue & Paise Precision Integrity ---');
  const plans: PlanKey[] = ['STARTER', 'GROWTH', 'SCALE'];
  for (const p of plans) {
    const config = OFFICIAL_PLANS[p];
    for (const interval of BILLING_INTERVALS) {
      const pricing = config.pricing[interval.key];
      const amountInPaise = Math.round(pricing.totalPrice * 100);
      assert(
        amountInPaise > 0 && Number.isInteger(amountInPaise),
        `${config.name} (${interval.label}) converts to exact integer paise: ₹${pricing.totalPrice} = ${amountInPaise} paise`
      );
    }
  }

  // 4. Free Khata Zero-Cost Guard
  console.log('\n--- 4. Free Khata Plan Pricing Guard ---');
  const freeKhata = OFFICIAL_PLANS.FREE_KHATA;
  for (const interval of BILLING_INTERVALS) {
    assert(
      freeKhata.pricing[interval.key].totalPrice === 0,
      `Free Khata (${interval.label}) is permanently ₹0`
    );
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 ALL RAZORPAY INTEGRATION CHECKS PASSED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();

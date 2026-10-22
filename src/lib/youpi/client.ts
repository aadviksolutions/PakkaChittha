import crypto from 'crypto';

export interface YoupiPaymentSession {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: string;
  currency: string;
  status: string;
  checkoutUrl: string;
  queuePosition?: number;
}

export interface CreatePaymentSessionParams {
  orderId: string;
  amountInRupees: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobile?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface VerifyWebhookSignatureParams {
  rawBody: string;
  signature?: string | null;
  signatureV2?: string | null;
  timestamp?: string | null;
  webhookSecret?: string;
  toleranceSeconds?: number;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Returns true if YOUPI PG test gateway is explicitly enabled and properly configured.
 * Strictly returns false in production environments to guarantee isolation.
 */
export function isYoupiTestConfigured(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.YOUPI_TEST_ENABLED !== 'true') {
    return false;
  }
  const baseUrl = process.env.YOUPI_API_BASE_URL;
  const merchantId = process.env.YOUPI_MERCHANT_ID;
  const apiKey = process.env.YOUPI_API_KEY;
  const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET;

  return Boolean(baseUrl && merchantId && apiKey && webhookSecret);
}

/**
 * Validates and retrieves the isolated YOUPI PG test configuration.
 * Fails closed if accessed in production or if credentials are missing.
 */
export function getYoupiConfig() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: YOUPI PG test gateway is forbidden in production environment.');
  }
  if (process.env.YOUPI_TEST_ENABLED !== 'true') {
    throw new Error('YOUPI PG test gateway is disabled. Set YOUPI_TEST_ENABLED=true in non-production environment.');
  }

  const baseUrl = process.env.YOUPI_API_BASE_URL;
  const merchantId = process.env.YOUPI_MERCHANT_ID;
  const apiKey = process.env.YOUPI_API_KEY;
  const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET;

  if (!baseUrl || !merchantId || !apiKey || !webhookSecret) {
    throw new Error(
      'Incomplete YOUPI PG test configuration. Required variables: YOUPI_API_BASE_URL, YOUPI_MERCHANT_ID, YOUPI_API_KEY, YOUPI_WEBHOOK_SECRET.'
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    merchantId,
    apiKey,
    webhookSecret,
  };
}

/**
 * Creates an isolated test payment session on the YOUPI PG API.
 * Uses trusted server-side amounts and server-generated idempotency keys.
 */
export async function createYoupiPaymentSession(
  params: CreatePaymentSessionParams
): Promise<YoupiPaymentSession> {
  const config = getYoupiConfig();

  const {
    orderId,
    amountInRupees,
    currency = 'INR',
    customerName,
    customerEmail,
    customerMobile,
    metadata = {},
    idempotencyKey,
  } = params;

  if (!orderId || typeof orderId !== 'string') {
    throw new Error('Valid orderId string is required.');
  }
  if (typeof amountInRupees !== 'number' || amountInRupees <= 0 || !Number.isFinite(amountInRupees)) {
    throw new Error('Valid positive amountInRupees is required.');
  }

  const payload: Record<string, any> = {
    orderId,
    amount: amountInRupees.toFixed(2),
    currency: currency.toUpperCase(),
    metadata: {
      ...metadata,
      platform: 'PakkaChittha',
      testMode: true,
      createdAt: new Date().toISOString(),
    },
  };

  if (customerName || customerEmail || customerMobile) {
    payload.customer = {
      ...(customerName ? { fullName: customerName } : {}),
      ...(customerEmail ? { email: customerEmail } : {}),
      ...(customerMobile ? { phoneNumber: customerMobile } : {}),
    };
  }

  const generatedIdempotencyKey = idempotencyKey || `idem_${orderId}_${Date.now()}`;

  const response = await fetch(`${config.baseUrl}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Key': config.apiKey,
      'Idempotency-Key': generatedIdempotencyKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  const responseData: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
    throw new Error(`YOUPI PG payment creation failed: ${errorMsg}`);
  }

  if (!responseData.paymentId || !responseData.orderId) {
    throw new Error('YOUPI PG returned malformed payment session response.');
  }

  return {
    paymentId: responseData.paymentId,
    orderId: responseData.orderId,
    amount: responseData.amount || amountInRupees.toFixed(2),
    amountPaise: responseData.amountPaise || String(Math.round(amountInRupees * 100)),
    currency: responseData.currency || currency,
    status: responseData.status || 'ACTIVE',
    checkoutUrl: responseData.checkoutUrl || `${config.baseUrl}/checkout/${responseData.paymentId}`,
    queuePosition: responseData.queuePosition,
  };
}

/**
 * Retrieves payment status from YOUPI PG.
 */
export async function getYoupiPaymentSession(paymentId: string): Promise<any> {
  const config = getYoupiConfig();

  const response = await fetch(`${config.baseUrl}/api/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Key': config.apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to query YOUPI PG payment ${paymentId}: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Constant-time verification of YOUPI PG webhook signatures and timestamps.
 * Strictly verifies raw body and prevents replay attacks.
 */
export function verifyYoupiWebhookSignature(
  params: VerifyWebhookSignatureParams
): WebhookVerificationResult {
  const {
    rawBody,
    signature,
    signatureV2,
    timestamp,
    webhookSecret,
    toleranceSeconds = 300, // 5-minute replay tolerance window
  } = params;

  const secret = webhookSecret || (isYoupiTestConfigured() ? getYoupiConfig().webhookSecret : null);
  if (!secret) {
    return { isValid: false, reason: 'MISSING_SECRET' };
  }

  if (!rawBody || typeof rawBody !== 'string') {
    return { isValid: false, reason: 'MISSING_RAW_BODY' };
  }

  // 1. Verify Timestamp Freshness if provided (V2 replay protection)
  if (timestamp) {
    let eventTimeMs: number;
    const numericTs = Number(timestamp);
    if (!isNaN(numericTs) && numericTs > 0) {
      // Unix timestamp (seconds or milliseconds)
      eventTimeMs = numericTs > 1e11 ? numericTs : numericTs * 1000;
    } else {
      eventTimeMs = Date.parse(timestamp);
    }

    if (isNaN(eventTimeMs)) {
      return { isValid: false, reason: 'INVALID_TIMESTAMP_FORMAT' };
    }

    const nowMs = Date.now();
    const toleranceMs = toleranceSeconds * 1000;

    // Check if timestamp is older than tolerance (stale/replay)
    if (nowMs - eventTimeMs > toleranceMs) {
      return { isValid: false, reason: 'TIMESTAMP_STALE' };
    }

    // Check if timestamp is too far in future (> 60s clock skew tolerance)
    if (eventTimeMs - nowMs > 60 * 1000) {
      return { isValid: false, reason: 'TIMESTAMP_IN_FUTURE' };
    }
  }

  // 2. Validate V2 Timestamped Signature if provided
  if (signatureV2) {
    if (!timestamp) {
      return { isValid: false, reason: 'MISSING_TIMESTAMP_FOR_V2' };
    }

    const cleanSigV2 = signatureV2.replace(/^sha256=/, '').trim();
    const expectedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(expectedPayload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(cleanSigV2, 'utf8');

    if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { isValid: true };
    }
  }

  // 3. Fallback / Standard V1 Signature verification
  if (signature) {
    const cleanSig = signature.replace(/^sha256=/, '').trim();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(cleanSig, 'utf8');

    if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { isValid: true };
    }
  }

  return { isValid: false, reason: 'SIGNATURE_MISMATCH' };
}

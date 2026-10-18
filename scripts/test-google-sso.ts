import prisma from '../src/lib/prisma';
import {
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
  buildGoogleAuthUrl,
  authenticateGoogleUser,
  GoogleUserProfile,
} from '../src/lib/auth/google';
import { validateSessionToken, destroySession } from '../src/lib/auth/session';
import { PlatformRole, BusinessRole, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING GOOGLE SSO SUITE & INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Test URL & Redirect URI Generation
  console.log('\n--- 1. Testing URL & Redirect URI Generation ---');
  const mockReqLocal = new Request('http://localhost:3000/api/auth/google', {
    headers: { host: 'localhost:3000' },
  });
  const localRedirectUri = getGoogleRedirectUri(mockReqLocal);
  assert(
    localRedirectUri === 'http://localhost:3000/api/auth/callback/google',
    `Localhost dynamic redirect URI matches: ${localRedirectUri}`
  );

  const mockReqProd = new Request('https://lenden-pi.vercel.app/api/auth/google', {
    headers: {
      host: 'lenden-pi.vercel.app',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'lenden-pi.vercel.app',
    },
  });
  const prodRedirectUri = getGoogleRedirectUri(mockReqProd);
  assert(
    prodRedirectUri === 'https://lenden-pi.vercel.app/api/auth/callback/google',
    `Production dynamic redirect URI matches: ${prodRedirectUri}`
  );

  const authUrl = buildGoogleAuthUrl({
    clientId: 'test-google-client-id-123.apps.googleusercontent.com',
    redirectUri: prodRedirectUri,
    state: 'test-secure-state-nonce',
  });
  assert(
    authUrl.includes('accounts.google.com/o/oauth2/v2/auth') &&
      authUrl.includes('client_id=test-google-client-id-123') &&
      authUrl.includes('response_type=code') &&
      authUrl.includes('scope=openid+email+profile') &&
      authUrl.includes('state=test-secure-state-nonce'),
    'Google OAuth 2.0 Auth URL correctly constructed with required query parameters'
  );

  // 2. Test New User Onboarding via Google SSO
  console.log('\n--- 2. Testing New User Onboarding via Google SSO ---');
  const testNewEmail = `test_google_new_${Date.now()}@example.com`;
  const newProfile: GoogleUserProfile = {
    id: `google-sub-${Date.now()}`,
    email: testNewEmail,
    name: 'Rohan Sharma',
    picture: 'https://lh3.googleusercontent.com/a/test-avatar',
    emailVerified: true,
  };

  const newAuthResult = await authenticateGoogleUser(newProfile);
  assert(newAuthResult.isNewUser === true, 'Correctly flags as new user registration');
  assert(newAuthResult.user.email === testNewEmail, 'User record created with normalized email');
  assert(newAuthResult.user.name === 'Rohan Sharma', 'User record created with Google name');
  assert(newAuthResult.user.platformRole === PlatformRole.USER, 'Strictly enforces USER platform role');
  assert(Boolean(newAuthResult.business?.id), 'Provisions a new Business workspace');
  assert(newAuthResult.business?.role === BusinessRole.BUSINESS_OWNER, 'Assigns BUSINESS_OWNER membership');
  assert(newAuthResult.business?.plan === SubscriptionPlan.FREE_TRIAL, 'Provisions 14-day FREE_TRIAL subscription');

  // Verify Session in database
  const sessionValid = await validateSessionToken(newAuthResult.sessionToken);
  assert(Boolean(sessionValid), 'Session token validates successfully in PostgreSQL');
  assert(sessionValid?.user.email === testNewEmail, 'Session belongs to authenticated Google user');
  assert(sessionValid?.activeBusiness?.id === newAuthResult.business?.id, 'Session activeBusiness matches new workspace');

  // 3. Test Existing User Account Preservation (No Duplication)
  console.log('\n--- 3. Testing Existing User Account Preservation ---');
  // Add a customer and invoice to newAuthResult's workspace to simulate established business data
  const existingBizId = newAuthResult.business!.id;
  const testCustomer = await prisma.customer.create({
    data: {
      businessId: existingBizId,
      name: 'Existing Customer Store',
      mobile: '9876543210',
    },
  });

  const trialSubBefore = await prisma.subscription.findFirst({
    where: { businessId: existingBizId },
    orderBy: { createdAt: 'desc' },
  });

  // Re-login with same Google profile
  const existingAuthResult = await authenticateGoogleUser(newProfile);
  assert(existingAuthResult.isNewUser === false, 'Correctly flags as existing user');
  assert(existingAuthResult.user.id === newAuthResult.user.id, 'Preserves existing user ID (NO duplicates)');
  assert(existingAuthResult.business?.id === existingBizId, 'Preserves existing Business workspace ID');

  const customerStillExists = await prisma.customer.findUnique({
    where: { id: testCustomer.id },
  });
  assert(Boolean(customerStillExists), 'Existing business data (customers, records) remains 100% intact');

  const trialSubAfter = await prisma.subscription.findFirst({
    where: { businessId: existingBizId },
    orderBy: { createdAt: 'desc' },
  });
  assert(
    trialSubBefore?.id === trialSubAfter?.id &&
      trialSubBefore?.endDate?.getTime() === trialSubAfter?.endDate?.getTime(),
    'Subscription and trial dates completely preserved without reset'
  );

  // 4. Test Existing Email/Password User Signing in via Google
  console.log('\n--- 4. Testing Traditional Email/Password User Logging in via Google ---');
  const traditionalEmail = `traditional_user_${Date.now()}@example.com`;
  const traditionalUser = await prisma.user.create({
    data: {
      email: traditionalEmail,
      name: 'Traditional Shopkeeper',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', // mock hash
      platformRole: PlatformRole.USER,
    },
  });

  const traditionalBiz = await prisma.business.create({
    data: {
      name: 'Sharma General Store',
      email: traditionalEmail,
      currency: 'INR',
    },
  });

  await prisma.businessMembership.create({
    data: {
      userId: traditionalUser.id,
      businessId: traditionalBiz.id,
      role: BusinessRole.BUSINESS_OWNER,
    },
  });

  // User logs in via Google with matching email
  const linkedGoogleResult = await authenticateGoogleUser({
    id: `google-sub-trad-${Date.now()}`,
    email: traditionalEmail,
    name: 'Traditional Shopkeeper Google Name',
    emailVerified: true,
  });

  assert(linkedGoogleResult.isNewUser === false, 'Links to existing email/password account seamlessly');
  assert(linkedGoogleResult.user.id === traditionalUser.id, 'User ID matches existing account');
  assert(linkedGoogleResult.business?.id === traditionalBiz.id, 'Business workspace matches existing workspace');

  // Verify passwordHash is untouched
  const reloadedUser = await prisma.user.findUnique({ where: { id: traditionalUser.id } });
  assert(
    reloadedUser?.passwordHash === '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
    'User password hash remains preserved for regular email/password login'
  );

  // 5. Test Suspended User Access Prevention
  console.log('\n--- 5. Testing Suspended User Access Prevention ---');
  await (prisma.user as any).update({
    where: { id: traditionalUser.id },
    data: { isSuspended: true, suspendedReason: 'Policy Violation' },
  });

  let suspendedBlocked = false;
  try {
    await authenticateGoogleUser({
      id: `google-sub-trad-${Date.now()}`,
      email: traditionalEmail,
      name: 'Traditional Shopkeeper',
      emailVerified: true,
    });
  } catch (err: any) {
    if (err.message.includes('Account Suspended')) {
      suspendedBlocked = true;
    }
  }
  assert(suspendedBlocked, 'Suspended users are blocked from logging in via Google SSO');

  // 6. Test Logout & Subsequent Login
  console.log('\n--- 6. Testing Logout & Subsequent Login Flow ---');
  await destroySession(linkedGoogleResult.sessionToken);
  const validatedAfterLogout = await validateSessionToken(linkedGoogleResult.sessionToken);
  assert(validatedAfterLogout === null, 'Session is cleanly invalidated upon logout');

  // Clean up test data
  console.log('\n--- Cleaning up test records ---');
  await prisma.customer.deleteMany({ where: { businessId: existingBizId } });
  await prisma.subscription.deleteMany({ where: { businessId: existingBizId } });
  await prisma.businessMembership.deleteMany({ where: { businessId: existingBizId } });
  await prisma.session.deleteMany({ where: { userId: newAuthResult.user.id } });
  await prisma.business.deleteMany({ where: { id: existingBizId } });
  await prisma.user.deleteMany({ where: { id: newAuthResult.user.id } });

  await prisma.businessMembership.deleteMany({ where: { businessId: traditionalBiz.id } });
  await prisma.session.deleteMany({ where: { userId: traditionalUser.id } });
  await prisma.business.deleteMany({ where: { id: traditionalBiz.id } });
  await prisma.user.deleteMany({ where: { id: traditionalUser.id } });

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test suite uncaught error:', e);
    process.exit(1);
  });

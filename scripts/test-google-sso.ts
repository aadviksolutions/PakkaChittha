import 'dotenv/config';
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
  console.log('🧪 PAKKACHITTHA GOOGLE AUTHENTICATION SUITE');
  console.log('Testing Diagnostics, Modes, Security & Integrations');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
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
      authUrl.includes('state=test-secure-state-nonce') &&
      authUrl.includes('access_type=offline') &&
      authUrl.includes('prompt=select_account'),
    'Google OAuth 2.0 Auth URL correctly constructed with state, offline access, and select_account prompt'
  );

  // 2. Test First-Time Google Signup (Business Mode)
  console.log('\n--- 2. Testing First-Time Google Signup (Business Mode) ---');
  const bizUserTimestamp = Date.now();
  const testBizEmail = `test_google_biz_${bizUserTimestamp}@example.com`;
  const bizGoogleSub = `google-sub-biz-${bizUserTimestamp}`;
  const bizProfile: GoogleUserProfile = {
    id: bizGoogleSub,
    email: testBizEmail,
    name: 'Rohan Sharma',
    picture: 'https://lh3.googleusercontent.com/a/test-biz-avatar',
    emailVerified: true,
  };

  const bizAuthResult = await authenticateGoogleUser(bizProfile, { mode: 'business' });
  assert(bizAuthResult.isNewUser === true, 'Correctly flags as new user registration');
  assert(bizAuthResult.user.email === testBizEmail, 'User record created with normalized email');
  assert(bizAuthResult.user.name === 'Rohan Sharma', 'User record created with Google name');
  assert(bizAuthResult.user.platformRole === PlatformRole.USER, 'Strictly enforces USER platform role (never Super Admin)');
  assert(Boolean(bizAuthResult.business?.id), 'Provisions a new Business workspace');
  assert(bizAuthResult.business?.role === BusinessRole.BUSINESS_OWNER, 'Assigns BUSINESS_OWNER membership');
  assert(bizAuthResult.business?.plan === SubscriptionPlan.FREE_TRIAL, 'Provisions 14-day FREE_TRIAL subscription');
  assert(bizAuthResult.household === null, 'Household is null for pure business signup');

  // Verify googleId in database
  const createdBizUser = await prisma.user.findUnique({ where: { id: bizAuthResult.user.id } });
  assert(createdBizUser?.googleId === bizGoogleSub, 'Stores stable Google subject identifier (sub)');
  assert(createdBizUser?.avatarUrl === bizProfile.picture, 'Stores Google profile picture');

  // Verify Session in database
  const bizSession = await validateSessionToken(bizAuthResult.sessionToken);
  assert(Boolean(bizSession), 'Session token validates successfully in PostgreSQL');
  assert(bizSession?.user.email === testBizEmail, 'Session belongs to authenticated Google user');
  assert(bizSession?.activeBusiness?.id === bizAuthResult.business?.id, 'Session activeBusiness matches new workspace');

  // 3. Test First-Time Google Signup (Household / Mera Ghar Mode)
  console.log('\n--- 3. Testing First-Time Google Signup (Household Mode - Mera Ghar) ---');
  const householdTimestamp = Date.now() + 1;
  const testHouseholdEmail = `test_google_ghar_${householdTimestamp}@example.com`;
  const householdGoogleSub = `google-sub-ghar-${householdTimestamp}`;
  const householdProfile: GoogleUserProfile = {
    id: householdGoogleSub,
    email: testHouseholdEmail,
    name: 'Priya Verma',
    picture: 'https://lh3.googleusercontent.com/a/test-ghar-avatar',
    emailVerified: true,
  };

  const householdAuthResult = await authenticateGoogleUser(householdProfile, { mode: 'household' });
  assert(householdAuthResult.isNewUser === true, 'Correctly flags as new household user');
  assert(householdAuthResult.user.email === testHouseholdEmail, 'Household user created with normalized email');
  assert(householdAuthResult.business === null, 'Business is NULL for pure household signup (100% Free Mera Ghar)');
  assert(Boolean(householdAuthResult.household?.id), 'Provisions a new Household entity');
  assert(householdAuthResult.household?.role === 'OWNER', 'Household creator assigned OWNER role');

  // Verify default categories seeded for this household
  const householdCategories = await prisma.householdCategory.findMany({
    where: { householdId: householdAuthResult.household!.id },
  });
  assert(householdCategories.length > 20, `Default Indian categories automatically seeded (${householdCategories.length} categories)`);

  // Verify session has activeBusinessId === null
  const householdSession = await validateSessionToken(householdAuthResult.sessionToken);
  assert(Boolean(householdSession), 'Household session token validates successfully');
  assert(householdSession?.activeBusiness === null, 'Household session activeBusiness is correctly NULL');

  // 4. Test First-Time Google Signup (Free Khata Mode)
  console.log('\n--- 4. Testing First-Time Google Signup (Free Khata Mode) ---');
  const freeKhataTimestamp = Date.now() + 2;
  const testKhataEmail = `test_google_khata_${freeKhataTimestamp}@example.com`;
  const khataGoogleSub = `google-sub-khata-${freeKhataTimestamp}`;
  const khataProfile: GoogleUserProfile = {
    id: khataProfileEmail(testKhataEmail, khataGoogleSub),
    email: testKhataEmail,
    name: 'Amit Patel',
    emailVerified: true,
  };

  function khataProfileEmail(email: string, sub: string): string {
    return sub;
  }

  const khataAuthResult = await authenticateGoogleUser({
    id: khataGoogleSub,
    email: testKhataEmail,
    name: 'Amit Patel',
    emailVerified: true,
  }, { mode: 'free_khata' });
  assert(khataAuthResult.isNewUser === true, 'Flags as new user registration for Free Khata');
  assert(khataAuthResult.business?.plan === SubscriptionPlan.FREE_KHATA, 'Provisions permanent FREE_KHATA plan');

  // 5. Test Repeated Google Login (No Duplicate Accounts Created)
  console.log('\n--- 5. Testing Repeated Google Login via Stable Subject ID ---');
  const repeatLoginResult = await authenticateGoogleUser(bizProfile, { mode: 'business' });
  assert(repeatLoginResult.isNewUser === false, 'Flags as existing user on repeat login');
  assert(repeatLoginResult.user.id === bizAuthResult.user.id, 'User ID strictly matches existing account (No duplicate users)');
  assert(repeatLoginResult.business?.id === bizAuthResult.business?.id, 'Preserves existing business workspace');

  // Check user count in database for this email
  const userCount = await prisma.user.count({ where: { email: testBizEmail } });
  assert(userCount === 1, 'Exactly one user record exists in database for this email');

  // 6. Test Existing Email/Password User Linking via Google
  console.log('\n--- 6. Testing Existing Email/Password User Linking via Google ---');
  const tradTimestamp = Date.now() + 3;
  const tradEmail = `trad_shop_${tradTimestamp}@example.com`;
  const mockPasswordHash = '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890dummy';

  const tradUser = await prisma.user.create({
    data: {
      name: 'Sunil Kumar',
      email: tradEmail,
      passwordHash: mockPasswordHash,
      platformRole: PlatformRole.USER,
    },
  });

  const tradBiz = await prisma.business.create({
    data: {
      name: 'Sunil Traders',
      email: tradEmail,
      currency: 'INR',
    },
  });

  await prisma.businessMembership.create({
    data: {
      userId: tradUser.id,
      businessId: tradBiz.id,
      role: BusinessRole.BUSINESS_OWNER,
    },
  });

  // User logs in via Google with same verified email
  const tradGoogleSub = `google-sub-trad-${tradTimestamp}`;
  const linkedResult = await authenticateGoogleUser({
    id: tradGoogleSub,
    email: tradEmail,
    name: 'Sunil Kumar Google',
    emailVerified: true,
  });

  assert(linkedResult.isNewUser === false, 'Existing password account linked seamlessly');
  assert(linkedResult.user.id === tradUser.id, 'Preserves existing user ID');
  assert(linkedResult.business?.id === tradBiz.id, 'Preserves existing business workspace');

  // Check that googleId was linked and passwordHash remains preserved
  const reloadedTradUser = await prisma.user.findUnique({ where: { id: tradUser.id } });
  assert(reloadedTradUser?.googleId === tradGoogleSub, 'Stable googleId successfully associated to existing account');
  assert(reloadedTradUser?.passwordHash === mockPasswordHash, 'Password hash preserved intact for regular password sign-in');

  // 7. Security: Reject Unverified Email from Google
  console.log('\n--- 7. Security: Rejecting Unverified Google Email ---');
  let unverifiedBlocked = false;
  try {
    await authenticateGoogleUser({
      id: `google-sub-unverified-${Date.now()}`,
      email: `unverified_${Date.now()}@example.com`,
      name: 'Unverified Hacker',
      emailVerified: false, // NOT verified by Google
    });
  } catch (err: any) {
    if (err.message.includes('not verified')) {
      unverifiedBlocked = true;
    }
  }
  assert(unverifiedBlocked, 'Unverified Google email accounts strictly rejected (Prevents account takeover)');

  // 8. Security: Suspended User Access Prevention
  console.log('\n--- 8. Security: Suspended Account Access Prevention ---');
  await (prisma.user as any).update({
    where: { id: tradUser.id },
    data: { isSuspended: true, suspendedReason: 'Policy Violation for Testing' },
  });

  let suspendedBlocked = false;
  try {
    await authenticateGoogleUser({
      id: tradGoogleSub,
      email: tradEmail,
      name: 'Sunil Kumar',
      emailVerified: true,
    });
  } catch (err: any) {
    if (err.message.includes('Account Suspended')) {
      suspendedBlocked = true;
    }
  }
  assert(suspendedBlocked, 'Suspended users strictly prevented from logging in via Google');

  // 9. Session Invalidation on Logout
  console.log('\n--- 9. Session Management & Invalidation ---');
  await destroySession(repeatLoginResult.sessionToken);
  const validatedAfterLogout = await validateSessionToken(repeatLoginResult.sessionToken);
  assert(validatedAfterLogout === null, 'Session cleanly destroyed and invalidated in PostgreSQL');

  // Clean up test data
  console.log('\n--- Cleaning up test records ---');
  // Biz user cleanup
  if (bizAuthResult.business?.id) {
    await prisma.subscription.deleteMany({ where: { businessId: bizAuthResult.business.id } });
    await prisma.businessMembership.deleteMany({ where: { businessId: bizAuthResult.business.id } });
    await prisma.session.deleteMany({ where: { userId: bizAuthResult.user.id } });
    await prisma.business.deleteMany({ where: { id: bizAuthResult.business.id } });
    await prisma.user.deleteMany({ where: { id: bizAuthResult.user.id } });
  }

  // Household user cleanup
  if (householdAuthResult.household?.id) {
    await prisma.householdCategory.deleteMany({ where: { householdId: householdAuthResult.household.id } });
    await prisma.householdMember.deleteMany({ where: { householdId: householdAuthResult.household.id } });
    await prisma.household.deleteMany({ where: { id: householdAuthResult.household.id } });
    await prisma.session.deleteMany({ where: { userId: householdAuthResult.user.id } });
    await prisma.user.deleteMany({ where: { id: householdAuthResult.user.id } });
  }

  // Free khata cleanup
  if (khataAuthResult.business?.id) {
    await prisma.subscription.deleteMany({ where: { businessId: khataAuthResult.business.id } });
    await prisma.businessMembership.deleteMany({ where: { businessId: khataAuthResult.business.id } });
    await prisma.session.deleteMany({ where: { userId: khataAuthResult.user.id } });
    await prisma.business.deleteMany({ where: { id: khataAuthResult.business.id } });
    await prisma.user.deleteMany({ where: { id: khataAuthResult.user.id } });
  }

  // Trad user cleanup
  await prisma.businessMembership.deleteMany({ where: { businessId: tradBiz.id } });
  await prisma.session.deleteMany({ where: { userId: tradUser.id } });
  await prisma.business.deleteMany({ where: { id: tradBiz.id } });
  await prisma.user.deleteMany({ where: { id: tradUser.id } });

  console.log('\n====================================================');
  console.log(`ACCEPTANCE RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

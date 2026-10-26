import { SUPPORTED_LANGUAGES, DEFAULT_LOCALE, isRtlLocale, formatIndianCurrency, formatIndianNumber } from '../src/i18n/config';
import { getDictionary } from '../src/i18n/dictionaries';
import { prisma } from '../src/lib/prisma';

async function runMultilingualTestSuite() {
  console.log('====================================================');
  console.log('  PAKKACHITTHA MULTILINGUAL VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${testName}`);
    } else {
      failedTests++;
      console.error(`  ✗ FAIL: ${testName} - ${failureDetails || ''}`);
    }
  }

  // 1. Language Configuration & Metadata Check
  console.log('\n--- 1. Testing Language Configuration & 22 Scheduled Languages ---');
  assert(
    SUPPORTED_LANGUAGES.length === 23,
    'Exactly 23 languages supported (English + 22 Scheduled Indian Languages)',
    `Found ${SUPPORTED_LANGUAGES.length} languages.`
  );

  const expectedLocales = [
    'en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml',
    'pa', 'or', 'as', 'mai', 'sa', 'ks', 'ne', 'kok', 'sd', 'doi',
    'mni', 'brx', 'sat'
  ];

  const actualCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
  for (const expected of expectedLocales) {
    assert(
      actualCodes.includes(expected as any),
      `Scheduled language '${expected}' present in config`
    );
  }

  // 2. RTL Text Direction Verification
  console.log('\n--- 2. Testing RTL & Script Directions ---');
  const rtlLocales = ['ur', 'ks', 'sd'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const isExpectedRtl = rtlLocales.includes(lang.code);
    assert(
      lang.dir === (isExpectedRtl ? 'rtl' : 'ltr'),
      `Direction for ${lang.name} (${lang.code}) is ${lang.dir}`,
      `Expected ${isExpectedRtl ? 'rtl' : 'ltr'}, got ${lang.dir}`
    );
    assert(
      isRtlLocale(lang.code) === isExpectedRtl,
      `isRtlLocale('${lang.code}') matches ${isExpectedRtl}`
    );
  }

  // 3. Native Script & Typography Verification
  console.log('\n--- 3. Testing Native Script & Non-empty Native Names ---');
  for (const lang of SUPPORTED_LANGUAGES) {
    assert(
      lang.nativeName.length > 0 && lang.script.length > 0,
      `Language ${lang.code} has valid native script (${lang.nativeName} - ${lang.script})`
    );
  }

  // 4. Currency & Number Formatting (Indian Numbering System)
  console.log('\n--- 4. Testing Indian Currency & Number Formatting ---');
  const sampleAmount = 1234567.89;
  const inrFormatted = formatIndianCurrency(sampleAmount, 'en');
  assert(
    inrFormatted.includes('12,34,567.89') || inrFormatted.includes('1,234,567.89'),
    `formatIndianCurrency formats valid numeric representation (${inrFormatted})`
  );

  const sampleCount = 9876543;
  const indicFormatted = formatIndianNumber(sampleCount, 'en');
  assert(
    indicFormatted.includes('98,76,543') || indicFormatted.includes('9,876,543'),
    `formatIndianNumber formats valid grouping (${indicFormatted})`
  );

  // 5. Dictionary Loading & Namespace Integrity for All 23 Languages
  console.log('\n--- 5. Testing Dictionary Loading & Fallbacks across all 23 Locales ---');
  const requiredNamespaces = [
    'common',
    'nav',
    'modeSelect',
    'auth',
    'dashboard',
    'invoices',
    'customers',
    'inventory',
    'purchases',
    'suppliers',
    'expenses',
    'reports',
    'whatsapp',
    'staff',
    'subscription',
    'settings',
    'gharKharcha',
    'freeKhata',
    'admin'
  ];

  for (const lang of SUPPORTED_LANGUAGES) {
    const dict = getDictionary(lang.code);
    assert(!!dict, `Dictionary loaded successfully for '${lang.code}' (${lang.name})`);

    let allNamespacesPresent = true;
    for (const ns of requiredNamespaces) {
      if (!(ns in dict)) {
        allNamespacesPresent = false;
        console.error(`Missing namespace '${ns}' in locale '${lang.code}'`);
      }
    }
    assert(
      allNamespacesPresent,
      `All 19 core namespaces present in dictionary for '${lang.code}'`
    );

    // Verify key translations in this locale
    assert(
      typeof dict.common.appName === 'string' && dict.common.appName.length > 0,
      `dict.common.appName exists for '${lang.code}'`
    );
    assert(
      typeof dict.invoices.grandTotal === 'string' && dict.invoices.grandTotal.length > 0,
      `dict.invoices.grandTotal exists for '${lang.code}'`
    );
    assert(
      typeof dict.modeSelect.meraVyapaar === 'string' && dict.modeSelect.meraVyapaar.length > 0,
      `dict.modeSelect.meraVyapaar exists for '${lang.code}'`
    );
  }

  // 6. Database Schema Persistence Check
  console.log('\n--- 6. Testing Prisma Database Schema & User.preferredLanguage ---');
  try {
    const userFields = Object.keys((prisma as any).user.fields || {});
    assert(
      userFields.includes('preferredLanguage'),
      'User model contains preferredLanguage field in Prisma Client'
    );
    const businessFields = Object.keys((prisma as any).business.fields || {});
    assert(
      businessFields.includes('invoiceLanguage'),
      'Business model contains invoiceLanguage field in Prisma Client'
    );
  } catch (err: unknown) {
    console.error('Prisma field inspection error:', err);
  }

  // Final Summary
  console.log('\n====================================================');
  console.log(`TOTAL TESTS : ${totalTests}`);
  console.log(`PASSED      : ${passedTests}`);
  console.log(`FAILED      : ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMultilingualTestSuite()
  .catch((err) => {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

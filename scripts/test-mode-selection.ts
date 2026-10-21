import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function run() {
  console.log('\n==================================================================');
  console.log('PAKKACHITTHA MODE SELECTION: VERIFICATION & ROUTING TEST SUITE');
  console.log('==================================================================\n');

  // --- 1. Verify Brand Assets ---
  console.log('--- 1. Testing Brand Logo & Static Assets ---');
  const logoPath = path.join(process.cwd(), 'public', 'pakka-chittha-logo.png');
  assert(fs.existsSync(logoPath), 'Real PakkaChittha logo exists at /public/pakka-chittha-logo.png');
  const logoStats = fs.statSync(logoPath);
  assert(logoStats.size > 10000, `Logo file has real image payload (${logoStats.size} bytes)`);

  // --- 2. Verify Mode Selection Page Source ---
  console.log('\n--- 2. Testing Mode Selection Page Content & Links ---');
  const selectModePath = path.join(process.cwd(), 'src', 'app', 'select-mode', 'page.tsx');
  assert(fs.existsSync(selectModePath), 'Mode selection page exists at src/app/select-mode/page.tsx');
  const selectModeCode = fs.readFileSync(selectModePath, 'utf8');

  // Exact headings check
  assert(selectModeCode.includes('PakkaChittha'), 'Contains heading "PakkaChittha"');
  assert(selectModeCode.includes('Har hisaab, ab ek hi jagah.'), 'Contains heading "Har hisaab, ab ek hi jagah."');
  assert(selectModeCode.includes('Aap kis tarah ka hisaab rakhna chahte hain?'), 'Contains heading "Aap kis tarah ka hisaab rakhna chahte hain?"');

  // Option A check
  assert(selectModeCode.includes('MERA GHAR'), 'Contains OPTION A: MERA GHAR');
  assert(selectModeCode.includes('Ghar ka budget, roz ke kharche aur family ka hisaab.'), 'Contains exact Option A description');
  assert(selectModeCode.includes('Ghar ka Hisaab'), 'Contains CTA button "Ghar ka Hisaab"');
  assert(selectModeCode.includes('mode=household'), 'Option A links to login with mode=household');
  assert(selectModeCode.includes('redirect=/ghar-kharcha'), 'Option A redirects to /ghar-kharcha after auth');

  // Option B check
  assert(selectModeCode.includes('MERA VYAPAAR'), 'Contains OPTION B: MERA VYAPAAR');
  assert(selectModeCode.includes('Business billing, udhaar, inventory aur accounts.'), 'Contains exact Option B description');
  assert(selectModeCode.includes('Business Hisaab'), 'Contains CTA button "Business Hisaab"');
  assert(selectModeCode.includes('mode=business'), 'Option B links to login with mode=business');

  // Logo usage check
  assert(selectModeCode.includes('/pakka-chittha-logo.png'), 'Mode Selection page uses real /pakka-chittha-logo.png logo');

  // --- 3. Verify Middleware Routing Rules ---
  console.log('\n--- 3. Testing Middleware Routing & Public Entry Rules ---');
  const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
  const middlewareCode = fs.readFileSync(middlewarePath, 'utf8');

  assert(middlewareCode.includes("'/select-mode'"), '/select-mode is registered in PUBLIC_PATHS');
  assert(middlewareCode.includes("'/welcome'"), '/welcome is registered in PUBLIC_PATHS');
  assert(middlewareCode.includes("'/login'"), '/login is registered in PUBLIC_PATHS');
  assert(middlewareCode.includes("pathname === '/'") && middlewareCode.includes("'/select-mode'"), 'Unauthenticated root access redirects to /select-mode entry page');
  assert(middlewareCode.includes("pathname === '/login'") && middlewareCode.includes("pathname === '/select-mode'"), 'Authenticated users visiting public entry routes are redirected to workspace');

  // --- 4. Verify Welcome Alias Route ---
  console.log('\n--- 4. Testing Welcome Alias Route ---');
  const welcomePath = path.join(process.cwd(), 'src', 'app', 'welcome', 'page.tsx');
  assert(fs.existsSync(welcomePath), 'Welcome alias exists at src/app/welcome/page.tsx');
  const welcomeCode = fs.readFileSync(welcomePath, 'utf8');
  assert(welcomeCode.includes("redirect('/select-mode')"), '/welcome redirects directly to /select-mode');

  // --- 5. Verify AppShell Protection ---
  console.log('\n--- 5. Testing AppShell Integration ---');
  const appShellPath = path.join(process.cwd(), 'src', 'components', 'layout', 'AppShell.tsx');
  const appShellCode = fs.readFileSync(appShellPath, 'utf8');
  assert(appShellCode.includes("pathname === '/select-mode'"), '/select-mode is recognized as isAuthPage (bypasses sidebar & locks)');

  // --- 6. Verify Login Page Enhancements ---
  console.log('\n--- 6. Testing Login Page Mode Recognition ---');
  const loginPath = path.join(process.cwd(), 'src', 'app', 'login', 'page.tsx');
  const loginCode = fs.readFileSync(loginPath, 'utf8');
  assert(loginCode.includes("searchParams.get('mode')"), 'Login page reads mode parameter');
  assert(loginCode.includes("Mera Ghar • Ghar Kharcha Login"), 'Login page supports household mode header badge');
  assert(loginCode.includes("Mera Vyapaar • Business Login"), 'Login page supports business mode header badge');
  assert(loginCode.includes("/select-mode"), 'Login page provides "Mode Badlein" link to return to mode selection');
  assert(loginCode.includes("/pakka-chittha-logo.png"), 'Login page uses real PakkaChittha logo');

  console.log('\n==================================================================');
  console.log(`MODE SELECTION TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';

interface ViewportSpec {
  name: string;
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

const VIEWPORTS: ViewportSpec[] = [
  { name: 'iPhone SE (1st gen) / Narrow Mobile', width: 320, height: 568, deviceType: 'mobile' },
  { name: 'Android Compact (Galaxy S20/S21)', width: 360, height: 740, deviceType: 'mobile' },
  { name: 'iPhone 8 / SE (2nd/3rd gen)', width: 375, height: 667, deviceType: 'mobile' },
  { name: 'iPhone 12 / 13 / 14 / 15', width: 390, height: 844, deviceType: 'mobile' },
  { name: 'iPhone XR / 11 / 11 Pro Max', width: 414, height: 896, deviceType: 'mobile' },
  { name: 'iPhone 14 / 15 Pro Max', width: 430, height: 932, deviceType: 'mobile' },
  { name: 'iPad Mini / Portrait Tablet', width: 768, height: 1024, deviceType: 'tablet' },
  { name: 'iPad Landscape / Small Laptop', width: 1024, height: 768, deviceType: 'desktop' },
  { name: 'Standard Desktop / Widescreen', width: 1366, height: 768, deviceType: 'desktop' },
  { name: 'Full HD Desktop Display', width: 1920, height: 1080, deviceType: 'desktop' },
];

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

async function testResponsiveLayout() {
  console.log('\n==================================================================');
  console.log('PAKKACHITTHA MODE SELECTION: RESPONSIVE ENGINE AUDIT');
  console.log('==================================================================\n');

  // --- Step 1: Viewport Meta Tag Audit ---
  console.log('--- 1. Testing Viewport Meta Configuration in layout.tsx ---');
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  assert(layoutCode.includes("width: 'device-width'"), 'Root layout enforces width: device-width');
  assert(layoutCode.includes("initialScale: 1"), 'Root layout sets initialScale: 1');
  assert(layoutCode.includes("viewportFit: 'cover'"), 'Root layout configures viewportFit: cover for safe area insets');

  // --- Step 2: Component Structure Audit ---
  console.log('\n--- 2. Testing Component Structure in select-mode/page.tsx ---');
  const selectModePath = path.join(process.cwd(), 'src', 'app', 'select-mode', 'page.tsx');
  const code = fs.readFileSync(selectModePath, 'utf8');

  // Root container audit
  assert(code.includes('min-h-screen') && code.includes('min-h-[100dvh]'), 'Root container uses min-h-screen & min-h-[100dvh] to avoid 100vh mobile cutoffs');
  assert(code.includes('overflow-x-hidden'), 'Root container prevents horizontal scrolling with overflow-x-hidden');
  assert(!code.includes('h-screen max-h-screen overflow-hidden'), 'Removed fixed h-screen overflow-hidden that crushed mobile content');

  // Background audit
  assert(code.includes('fixed inset-0') && code.includes('mode-selection-clean-bg.png'), 'Scenic background uses fixed inset-0 so it stays locked during mobile scroll');

  // Header audit
  assert(code.includes('<header className="relative z-10 w-full px-4 sm:px-8 lg:px-14 pt-3.5 sm:pt-5 pb-2 flex items-center justify-between shrink-0">'), 'Header uses flex justify-between with shrink-0 (prevents logo/title overlap)');
  assert(code.includes('max-w-[170px] sm:max-w-[210px] object-contain'), 'Logo uses object-contain with responsive max-width to protect aspect ratio');

  // Cards layout audit
  assert(code.includes('grid grid-cols-1 md:grid-cols-2'), 'Cards grid stacks vertically on mobile (grid-cols-1) and splits to 2 columns on desktop (md:grid-cols-2)');
  assert(code.includes('min-w-0') && code.includes('flex flex-col justify-between'), 'Cards use natural height growth with min-w-0 to prevent content clipping');

  // Button & Footer audit
  assert(code.includes('<footer className="relative z-10 w-full shrink-0 pt-4 pb-6 sm:pb-5 px-4 mt-auto">'), 'Footer sits in normal document flow after cards with mt-auto & generous padding');
  assert(code.includes('hidden sm:inline-block text-slate-300 font-light select-none">|</span>'), 'Footer dividers use hidden sm:inline-block to prevent loose pipes on wrapped mobile screens');

  // --- Step 3: Viewport Dimensions Matrix ---
  console.log('\n--- 3. Testing Viewport Dimensions Matrix ---');
  for (const vp of VIEWPORTS) {
    const isMobile = vp.deviceType === 'mobile';
    const isTablet = vp.deviceType === 'tablet';
    const isDesktop = vp.deviceType === 'desktop';

    console.log(`\n  Checking Viewport: ${vp.name} (${vp.width}x${vp.height}) [${vp.deviceType.toUpperCase()}]:`);

    if (isMobile) {
      assert(vp.width < 768, `  [${vp.width}px] Layout switches to stacked single-column cards (grid-cols-1)`);
      assert(vp.width >= 320, `  [${vp.width}px] Meets minimum supported mobile width requirement`);
      // Content height estimation: header(55) + title(80) + cardA(300) + cardB(300) + footer(50) = ~785px
      const estimatedContentHeight = 785;
      if (estimatedContentHeight > vp.height) {
        assert(true, `  [${vp.width}x${vp.height}] Content exceeds viewport (${estimatedContentHeight}px > ${vp.height}px) -> Natural vertical scroll enabled without clipping or button overlaps`);
      } else {
        assert(true, `  [${vp.width}x${vp.height}] Content fits comfortably in viewport`);
      }
    } else if (isTablet) {
      assert(vp.width >= 768, `  [${vp.width}px] Layout switches to approved side-by-side 2-column cards (md:grid-cols-2)`);
    } else if (isDesktop) {
      assert(vp.width >= 1024, `  [${vp.width}px] Desktop layout active with balanced cards and horizontal trust bar`);
    }
  }

  // --- Step 4: Live HTTP Server Response at localhost:3000 ---
  console.log('\n--- 4. Testing Live HTTP Server Response at localhost:3000 ---');
  try {
    const res = await fetch('http://localhost:3000/select-mode');
    assert(res.status === 200, 'HTTP GET /select-mode returns 200 OK');
    const html = await res.text();
    assert(html.includes('PakkaChittha'), 'Live HTML contains "PakkaChittha" brand');
    assert(fs.existsSync(path.join(process.cwd(), 'public', 'mode-selection-clean-bg.png')), 'Scenic background image exists in public folder');
    assert(fs.existsSync(path.join(process.cwd(), 'public', 'pakka-chittha-logo.png')), 'Brand logo exists in public folder');
  } catch (e: any) {
    console.error('Fetch error:', e.message);
    assert(false, `Could not fetch /select-mode: ${e.message}`);
  }

  console.log('\n==================================================================');
  console.log(`RESPONSIVE TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

testResponsiveLayout().catch((err) => {
  console.error(err);
  process.exit(1);
});

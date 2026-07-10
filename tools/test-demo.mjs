/**
 * tools/test-demo.mjs
 * Playwright smoke tester for any Summer into AI demo.
 *
 * Usage:
 *   node tools/test-demo.mjs --url https://demo-01-money-trail.vercel.app --demo week-04-demo-01-money-trail
 *   node tools/test-demo.mjs --url http://localhost:3000 --demo week-04-demo-01-money-trail
 *
 * Runs demo-specific steps from tools/tests/{demo}.mjs if it exists,
 * otherwise does a generic smoke test (page loads, no blocking JS errors).
 *
 * Exit code: 0 = all checks passed, 1 = one or more failed.
 */

import { chromium } from 'playwright';
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse CLI args
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  if (process.argv[i].startsWith('--')) {
    args[process.argv[i].slice(2)] = process.argv[i + 1];
  }
}

const { url, demo } = args;
if (!url) { console.error('Usage: node tools/test-demo.mjs --url <url> [--demo <name>]'); process.exit(1); }

const results = [];
const consoleErrors = [];

function pass(msg) {
  results.push({ ok: true, msg });
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  results.push({ ok: false, msg });
  console.log(`  ✗ ${msg}`);
}

async function screenshot(page, name) {
  const dir = args.out || 'C:/Users/jake2/AppData/Local/Temp/claude/demo-tests';
  const path = `${dir}/${demo || 'demo'}-${name}.png`;
  try {
    await page.screenshot({ path, fullPage: false });
    console.log(`    📸 ${path}`);
  } catch (e) {
    console.log(`    (screenshot failed: ${e.message})`);
  }
}

async function run() {
  console.log(`\n🧪 Testing: ${url}`);
  if (demo) console.log(`   Suite:    tools/tests/${demo}.mjs\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  });
  const page = await context.newPage();

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // --- Generic: page loads ---
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (res.status() < 400) {
      pass(`Page loaded (HTTP ${res.status()})`);
    } else {
      fail(`Page returned HTTP ${res.status()}`);
    }
  } catch (e) {
    fail(`Page failed to load: ${e.message}`);
    await browser.close();
    return summarize();
  }

  await page.waitForTimeout(1500);

  // --- Run demo-specific suite if available ---
  const suitePath = resolve(__dirname, 'tests', `${demo}.mjs`);
  if (demo && existsSync(suitePath)) {
    const utils = { pass, fail, screenshot: (name) => screenshot(page, name) };
    try {
      const suite = await import(pathToFileURL(suitePath).href);
      await suite.default(page, utils);
    } catch (e) {
      fail(`Suite threw: ${e.message}`);
      console.error(e.stack);
    }
  } else {
    // Generic fallback: check for blocking JS errors and basic render
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (bodyText.length > 50) {
      pass('Page rendered content');
    } else {
      fail('Page body appears empty');
    }

    const blockingErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR_ABORTED')
    );
    if (blockingErrors.length === 0) {
      pass('No console errors');
    } else {
      fail(`Console errors: ${blockingErrors.slice(0, 3).join(' | ')}`);
    }

    await screenshot(page, 'smoke');
  }

  await browser.close();
  return summarize();
}

function summarize() {
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const blockingErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR_ABORTED')
  );

  console.log('\n' + '─'.repeat(50));
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (blockingErrors.length) {
    console.log(`Console errors (${blockingErrors.length}):`);
    blockingErrors.slice(0, 5).forEach(e => console.log(`  • ${e.slice(0, 120)}`));
  }
  console.log('─'.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });

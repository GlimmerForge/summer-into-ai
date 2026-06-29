/**
 * tools/substack/screenshot.mjs
 * Take three Playwright screenshots of any demo for Substack publishing.
 *
 * Usage (self-serve — starts/stops vercel dev automatically):
 *   node tools/substack/screenshot.mjs \
 *     --demo-dir projects/week-02/demo-09-the-broadcast \
 *     --out projects/week-02/demo-09-the-broadcast/public/assets
 *
 * Usage (bring your own server):
 *   node tools/substack/screenshot.mjs \
 *     --port 3001 \
 *     --out projects/week-02/demo-12/public/assets \
 *     --hero-image "https://images.metmuseum.org/CRDImages/ad/original/DP215410.jpg"
 *
 * Produces: hero.png, gameplay-1.png, gameplay-2.png in --out dir.
 *
 * IMPORTANT: Cross-origin images (Met Museum etc.) do NOT load in headless Playwright.
 * Always pass --hero-image and --outcome-image explicitly — the script injects them
 * via page.evaluate() so they always appear in the screenshots.
 *
 * Known-good Met Museum URLs:
 *   Washington Crossing the Delaware: https://images.metmuseum.org/CRDImages/ad/original/DP215410.jpg
 *   Patriots in the Dumps (colonial):  https://images.metmuseum.org/CRDImages/dp/original/DP876947.jpg
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'child_process';

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .reduce((acc, v, i, arr) => {
      if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
      return acc;
    }, [])
);

const DEMO_DIR    = args['demo-dir'] ? resolve(args['demo-dir']) : null;
const PORT        = parseInt(args.port || (DEMO_DIR ? '13579' : '3001'), 10);
const OUT         = args.out  || (DEMO_DIR ? join(DEMO_DIR, 'public/assets') : 'public/assets');
const HERO_IMAGE  = args['hero-image']    || 'https://images.metmuseum.org/CRDImages/ad/original/DP215410.jpg';
const OUTCOME_IMG = args['outcome-image'] || 'https://images.metmuseum.org/CRDImages/dp/original/DP876947.jpg';
const BASE        = `http://localhost:${PORT}`;

mkdirSync(OUT, { recursive: true });

// ── Self-serve mode: start vercel dev, wait until ready, then screenshot ───
let devServer = null;
if (DEMO_DIR) {
  console.log(`Starting vercel dev in ${DEMO_DIR} on port ${PORT}...`);
  devServer = spawn('npx', ['vercel', 'dev', '--yes', '--listen', String(PORT)], {
    cwd: DEMO_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  // Wait for the "Ready!" line (or a timeout)
  await new Promise((ok, fail) => {
    const timeout = setTimeout(() => fail(new Error('vercel dev timed out after 30s')), 30000);
    function check(chunk) {
      const text = chunk.toString();
      process.stderr.write(text);
      if (/ready|listening|started/i.test(text)) {
        clearTimeout(timeout);
        devServer.stdout.off('data', check);
        devServer.stderr.off('data', check);
        ok();
      }
    }
    devServer.stdout.on('data', check);
    devServer.stderr.on('data', check);
    devServer.on('error', fail);
    devServer.on('exit', code => {
      clearTimeout(timeout);
      if (code !== 0 && code !== null) fail(new Error(`vercel dev exited with code ${code}`));
    });
  });
  console.log(`Server ready on port ${PORT}.\n`);
  // Extra pause for API routes to initialize
  await new Promise(r => setTimeout(r, 2000));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

// --- HERO ---
console.log(`Loading ${BASE}...`);
await page.goto(BASE, { waitUntil: 'networkidle' });

// Wait for opening/cinematic screen — try common patterns
const cinematicSelectors = [
  '#cinematic-screen:not(.hidden)',
  '#intro-screen:not(.hidden)',
  '#start-screen:not(.hidden)',
  '.cinematic:not(.hidden)',
];
for (const sel of cinematicSelectors) {
  const found = await page.$(sel).catch(() => null);
  if (found) { await page.waitForSelector(sel, { timeout: 15000 }); break; }
}
// Fallback: wait for any begin/start button to appear
await page.waitForSelector('#begin-btn, #start-btn, .begin-btn, .start-btn', { timeout: 15000 })
  .catch(() => console.log('No begin button found, continuing'));

// Inject hero image (bypasses headless cross-origin block)
await page.evaluate((url) => {
  // Try common cinematic image element IDs
  const img = document.getElementById('cinematic-img') || document.getElementById('hero-img') || document.querySelector('.cinematic-img');
  if (img) { img.src = url; img.style.display = 'block'; }
  // Hide fallback elements
  ['cinematic-fallback', 'hero-fallback', 'intro-fallback'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}, HERO_IMAGE);
await page.waitForTimeout(1500);

console.log('Screenshot: hero.png');
await page.screenshot({ path: join(OUT, 'hero.png') });

// --- GAMEPLAY-1 (mission/game selection screen) ---
// Click the begin button
const beginBtn = await page.$('#begin-btn, #start-btn, .begin-btn, .start-btn');
if (beginBtn) await beginBtn.click();

// Wait for game/mission cards
console.log('Waiting for game screen...');
await page.waitForSelector(
  '.assign-btn:not(:disabled), .choice-btn:not(:disabled), .mission-card, .option-card, [data-action="select"]',
  { timeout: 30000 }
).catch(() => console.log('No interactive cards found, shooting anyway'));
await page.waitForTimeout(800);

console.log('Screenshot: gameplay-1.png');
await page.screenshot({ path: join(OUT, 'gameplay-1.png') });

// --- GAMEPLAY-2 (outcome/result screen) ---
// Try to commit/submit to get to outcome screen
const assignBtn = await page.$('.assign-btn:not(:disabled), .choice-btn:not(:disabled)');
if (assignBtn) {
  await assignBtn.click();
  await page.waitForTimeout(400);
}
const commitBtn = await page.$('#commit-btn, .commit-btn, #submit-btn, .submit-btn');
if (commitBtn) await commitBtn.click();

// Wait for outcome cards
console.log('Waiting for outcome screen...');
await page.waitForSelector('.outcome-card, .result-card, .result, #outcome-screen:not(.hidden)', { timeout: 30000 })
  .catch(() => console.log('No outcome cards found, shooting anyway'));
await page.waitForTimeout(1000);

// Inject outcome image
await page.evaluate((url) => {
  const fallback = document.querySelector('.outcome-card .outcome-scene-fallback, .result-card .scene-fallback');
  if (fallback) {
    const img = document.createElement('img');
    img.className = 'outcome-scene';
    img.alt = 'Scene';
    img.src = url;
    Object.assign(img.style, { width: '100%', height: '200px', objectFit: 'cover' });
    fallback.replaceWith(img);
  }
}, OUTCOME_IMG);
await page.waitForTimeout(800);

// Scroll to outcome section
await page.evaluate(() => {
  const el = document.getElementById('outcomes-section') || document.querySelector('.outcome-card, .result-card');
  if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
}).catch(() => {});

console.log('Screenshot: gameplay-2.png');
await page.screenshot({ path: join(OUT, 'gameplay-2.png') });

await browser.close();

if (devServer) {
  devServer.kill();
  console.log('Server stopped.');
}

console.log(`\nDone. Screenshots saved to: ${OUT}`);

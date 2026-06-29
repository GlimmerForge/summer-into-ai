/**
 * Custom screenshot script for demo-01-foia-ghost.
 * Enters ZIP 77536 (Deer Park TX — industrial area, good data), waits for all
 * three panels to populate, then captures the dossier mid-stream.
 *
 * Usage:
 *   node screenshot.mjs [--out public/assets] [--port 13580]
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const PORT = parseInt(args.port || '13580', 10);
const OUT  = resolve(__dir, args.out || 'public/assets');
const ZIP  = args.zip || '77536'; // Deer Park TX: TRI facilities + FEMA disasters
mkdirSync(OUT, { recursive: true });

// ── Start vercel dev ──────────────────────────────────────────────────────────
console.log(`Starting vercel dev on port ${PORT}...`);
const dev = spawn('npx', ['vercel', 'dev', '--yes', '--listen', String(PORT)], {
  cwd: __dir,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

await new Promise((ok, fail) => {
  const timeout = setTimeout(() => fail(new Error('vercel dev timed out')), 45000);
  const check = chunk => {
    const t = chunk.toString();
    process.stderr.write(t);
    if (/ready|listening|started/i.test(t)) {
      clearTimeout(timeout);
      dev.stdout.off('data', check);
      dev.stderr.off('data', check);
      ok();
    }
  };
  dev.stdout.on('data', check);
  dev.stderr.on('data', check);
  dev.on('error', fail);
});
await new Promise(r => setTimeout(r, 2500));
console.log('Server ready.\n');

const BASE = `http://localhost:${PORT}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(150000);
await page.setViewportSize({ width: 1280, height: 800 });

// ── Screenshot 1: hero — initial terminal state ───────────────────────────────
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
// Wait for ZIP input to be visible before proceeding
await page.waitForSelector('#zip-input', { timeout: 15000 });
await page.waitForTimeout(600);
console.log('Screenshot: hero.png');
await page.screenshot({ path: join(OUT, 'hero.png') });

// ── Enter ZIP and submit ──────────────────────────────────────────────────────
await page.fill('#zip-input', ZIP);
await page.click('#transmit-btn');
console.log(`Submitted ZIP ${ZIP}, waiting for panels...`);

// Wait for all three panels to go ONLINE or PARTIAL (not ACCESSING)
await page.waitForFunction(() => {
  const statuses = ['census-status', 'epa-status', 'fema-status']
    .map(id => document.getElementById(id)?.textContent ?? '');
  return statuses.every(s => s === 'ONLINE' || s === 'PARTIAL' || s === 'ERROR');
}, { timeout: 30000 });
await page.waitForTimeout(800); // let typewriter finish

// ── Screenshot 2: all panels filled with real data ───────────────────────────
console.log('Screenshot: gameplay-1.png');
await page.screenshot({ path: join(OUT, 'gameplay-1.png') });

// ── Wait for analysis to start streaming ─────────────────────────────────────
console.log('Waiting for GHOST ANALYSIS to stream...');
await page.waitForSelector('#analysis-section.visible', { timeout: 15000 });

// Wait until dossier has substantial content (at least one section header rendered)
// status-label changes to LIVE when first text token arrives
await page.waitForFunction(() => {
  const label = document.getElementById('analysis-status-label')?.textContent ?? '';
  const dossier = document.getElementById('dossier-content')?.textContent ?? '';
  return label === 'LIVE' || label === 'COMPLETE' || dossier.length > 100;
}).catch(() => console.log('Analysis may not have streamed — shooting anyway'));

// Give streaming more time to accumulate content
await page.waitForTimeout(10000);

// Scroll to show the analysis section
await page.evaluate(() => {
  document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'instant', block: 'start' });
});
await page.waitForTimeout(400);

// ── Screenshot 3: dossier streaming ──────────────────────────────────────────
console.log('Screenshot: gameplay-2.png');
await page.screenshot({ path: join(OUT, 'gameplay-2.png') });

await browser.close();
dev.kill();
console.log(`\nDone. Screenshots saved to: ${OUT}`);

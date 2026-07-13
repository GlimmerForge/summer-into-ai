/**
 * Smoke test: Full Disclosure (week-04-demo-09)
 * Path: investigate "Wells Fargo" → four bureau panels gather federal data in
 * parallel → SSE cross-reference synthesis (extended thinking) → structured
 * verdict with Disclosure Index + finding cards.
 */

export default async function test(page, { pass, fail, screenshot }) {

  // --- Phase 1: open the inquiry ---
  await page.fill('#company-input', 'Wells Fargo');
  await page.click('#investigate-btn');
  pass('Inquiry opened for "Wells Fargo"');

  // --- Phase 2: bureau panels fill in (need at least 2 with real data) ---
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.bureau-panel.loaded').length >= 2, null,
      { timeout: 90000 }
    );
    const counts = await page.evaluate(() => ({
      loaded: document.querySelectorAll('.bureau-panel.loaded').length,
      failed: document.querySelectorAll('.bureau-panel.failed').length
    }));
    pass(`Bureau reports landed: ${counts.loaded} with records, ${counts.failed} unavailable`);
  } catch {
    const status = await page.textContent('#global-status').catch(() => '');
    fail(`Fewer than 2 bureau panels returned data — status: "${status}"`);
    await screenshot('after-gather-timeout');
    return;
  }

  // Sanity: a loaded panel carries a headline number
  const headlineNum = await page.textContent('.bureau-panel.loaded .headline-num').catch(() => '');
  if (headlineNum.trim().length > 0) {
    pass(`Bureau panel has headline figure: ${headlineNum.trim()}`);
  } else {
    fail('Loaded bureau panel has no headline figure');
  }

  await screenshot('bureau-reports');

  // --- Phase 3: streamed cross-reference synthesis (>500 chars) ---
  try {
    await page.waitForFunction(
      () => (document.getElementById('synthesis-text')?.textContent?.trim().length || 0) > 500, null,
      { timeout: 180000 }
    );
    const synth = await page.textContent('#synthesis-text');
    pass(`Cross-reference synthesis streamed (${synth.trim().length} chars)`);
  } catch {
    const status = await page.textContent('#xref-status').catch(() => '');
    fail(`Synthesis never streamed past 500 chars — status: "${status}"`);
    await screenshot('after-synthesis-timeout');
    return;
  }

  // Extended thinking panel captured content (non-fatal if adaptive thinking skipped)
  const thinking = await page.textContent('#thinking-text').catch(() => '');
  if (thinking.trim().length > 20) {
    pass(`Analyst thinking captured (${thinking.trim().length} chars)`);
  } else {
    pass('Thinking panel empty (model may have skipped thinking — non-fatal)');
  }

  await screenshot('synthesis');

  // --- Phase 4: verdict — disclosure index + finding cards ---
  try {
    await page.waitForFunction(
      () => {
        const idx = document.getElementById('disclosure-index')?.textContent?.trim() || '';
        const cards = document.querySelectorAll('#finding-cards .finding-card').length;
        return /^\d+$/.test(idx) && cards >= 2;
      }, null,
      { timeout: 120000 }
    );
    pass('Verdict rendered: disclosure index + finding cards');
  } catch {
    const head = await page.textContent('#verdict-headline').catch(() => '');
    fail(`Verdict never rendered — headline: "${head}"`);
    await screenshot('after-verdict-timeout');
    return;
  }

  // Let the meter animation settle, then validate the index value
  await page.waitForTimeout(2500);
  const idxText = (await page.textContent('#disclosure-index')).trim();
  const idx = parseInt(idxText, 10);
  if (Number.isInteger(idx) && idx >= 0 && idx <= 100) {
    pass(`Disclosure Index: ${idx}/100`);
  } else {
    fail(`Disclosure Index malformed: "${idxText}"`);
  }

  // Finding cards carry cross-dataset badges (e.g. FEC×CFPB)
  const badges = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.finding-card .ds-badge')).map(e => e.textContent.trim())
  );
  if (badges.length >= 2 && badges.every(b => /^(FEC|CFPB|EPA|FDA)(×(FEC|CFPB|EPA|FDA))*$/.test(b))) {
    pass(`Finding badges valid: ${badges.join(', ')}`);
  } else {
    fail(`Finding badges malformed: ${badges.join(', ')}`);
  }

  const headline = await page.textContent('#verdict-headline');
  if (headline.trim().length > 10) {
    pass(`Verdict headline: "${headline.trim()}"`);
  } else {
    fail('Verdict headline missing or too short');
  }

  await screenshot('verdict');
}

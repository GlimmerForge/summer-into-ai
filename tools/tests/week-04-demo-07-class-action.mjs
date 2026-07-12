/**
 * Smoke test: Class Action (week-04-demo-07)
 * Path: search "Equifax" → CFPB discovery + AI clustering → select 3 exhibits →
 *       defense attorney streams attack → submit rebuttal → jury verdict + damages.
 */

export default async function test(page, { pass, fail, screenshot }) {

  // --- Phase 1: discovery ---
  await page.fill('#company-input', 'Equifax');
  await page.click('#discover-btn');
  pass('Filed discovery for "Equifax"');

  // Wait for pattern cards (CFPB fetch + Claude clustering — generous timeout)
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#patterns-grid .pattern-card').length >= 3, null,
      { timeout: 120000 }
    );
    const count = await page.evaluate(() => document.querySelectorAll('#patterns-grid .pattern-card').length);
    pass(`Discovery complete: ${count} candidate patterns`);
  } catch {
    const status = await page.textContent('#search-status').catch(() => '');
    fail(`Patterns never appeared — status: "${status}"`);
    await screenshot('after-discovery-timeout');
    return;
  }

  await screenshot('patterns');

  // Sanity: patterns carry real content
  const firstTheory = await page.textContent('#patterns-grid .pattern-card .pattern-theory').catch(() => '');
  if (firstTheory.trim().length > 10) {
    pass(`Pattern has legal theory: "${firstTheory.trim().slice(0, 60)}..."`);
  } else {
    fail('First pattern has no legal theory text');
  }

  // --- Phase 2: select exactly 3 exhibits ---
  const cards = await page.$$('#patterns-grid .pattern-card');
  for (let i = 0; i < 3; i++) {
    await cards[i].click();
    await page.waitForTimeout(150);
  }

  const selectedCount = await page.evaluate(() => document.querySelectorAll('.pattern-card.selected').length);
  if (selectedCount === 3) {
    pass('3 exhibits selected (A, B, C)');
  } else {
    fail(`Expected 3 selected cards, got ${selectedCount}`);
    return;
  }

  const proceedEnabled = await page.evaluate(() => !document.getElementById('proceed-btn').disabled);
  if (!proceedEnabled) {
    fail('Proceed button still disabled with 3 exhibits selected');
    return;
  }
  await page.click('#proceed-btn');
  pass('Proceeded to trial');

  // --- Phase 3: defense attack streams ---
  try {
    await page.waitForFunction(
      () => (document.getElementById('defense-text')?.textContent?.trim().length || 0) > 200, null,
      { timeout: 120000 }
    );
    const defText = await page.textContent('#defense-text');
    pass(`Defense argument streamed (${defText.trim().length} chars)`);

    // The defense must attack exhibits by name
    if (/Exhibit\s+[ABC]/i.test(defText)) {
      pass('Defense attacks exhibits by name');
    } else {
      fail('Defense text never mentions "Exhibit A/B/C"');
    }
  } catch {
    const status = await page.textContent('#trial-status').catch(() => '');
    fail(`Defense argument never streamed — status: "${status}"`);
    await screenshot('after-defense-timeout');
    return;
  }

  // Thinking panel captured content
  const thinking = await page.textContent('#thinking-text').catch(() => '');
  if (thinking.trim().length > 20) {
    pass(`Defense thinking captured (${thinking.trim().length} chars)`);
  } else {
    pass('Thinking panel empty (adaptive thinking may have skipped — non-fatal)');
  }

  // Wait for rebuttal section to unlock (stream done)
  try {
    await page.waitForFunction(
      () => document.getElementById('rebuttal-section')?.style.display === 'block', null,
      { timeout: 60000 }
    );
    pass('Rebuttal section unlocked after defense rested');
  } catch {
    fail('Rebuttal section never appeared — stream may not have completed');
    await screenshot('after-rebuttal-timeout');
    return;
  }

  await screenshot('defense');

  // --- Rebuttal → jury ---
  await page.fill('#rebuttal-input',
    'Counsel dismisses these complaints as unverified, but each narrative was filed under federal penalty and the defense offers no evidence rebutting a single one. The volume and consistency of these patterns across states establishes commonality, and the harm described is concrete: money lost, credit destroyed, hours wasted. The class asks the jury to sustain all three exhibits.');
  await page.click('#rebuttal-btn');
  pass('Closing rebuttal submitted');

  // --- Phase 4: verdict ---
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#verdict-cards .verdict-card').length === 3, null,
      { timeout: 120000 }
    );
    pass('Jury returned verdicts on all 3 exhibits');
  } catch {
    const status = await page.textContent('#jury-status').catch(() => '');
    fail(`Verdict never rendered — status: "${status}"`);
    await screenshot('after-verdict-timeout');
    return;
  }

  const rulings = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.verdict-ruling')).map(e => e.textContent.trim())
  );
  if (rulings.every(r => r === 'SUSTAINED' || r === 'DISMISSED')) {
    pass(`Rulings valid: ${rulings.join(', ')}`);
  } else {
    fail(`Unexpected rulings: ${rulings.join(', ')}`);
  }

  const juryStatement = await page.textContent('#jury-statement');
  if (juryStatement.trim().length > 50) {
    pass(`Jury statement present (${juryStatement.trim().length} chars)`);
  } else {
    fail('Jury statement missing or too short');
  }

  // Damages counter animates — wait for it to settle, then check format
  await page.waitForTimeout(3000);
  const damages = await page.textContent('#damages-counter');
  if (/^\$[\d,]+$/.test(damages.trim())) {
    pass(`Damages rendered: ${damages.trim()}`);
  } else {
    fail(`Damages counter malformed: "${damages}"`);
  }

  await screenshot('verdict');
}

/**
 * Smoke test: Situation Room (week-04-demo-06)
 * Tests: start shift → live-data briefing + threats render → allocate units → execute → judgment + score
 */

export default async function test(page, { pass, fail, screenshot }) {

  // 1. Start screen visible
  try {
    await page.waitForSelector('#start-btn', { timeout: 15000 });
    pass('Start screen rendered');
  } catch {
    fail('Start button never appeared');
    await screenshot('no-start-btn');
    return;
  }

  await page.click('#start-btn');

  // 2. Wait for briefing: live-data fetch + Claude forced tool call (can be slow)
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.threat-card').length >= 2, null,
      { timeout: 120000 }
    );
    const nThreats = await page.evaluate(() => document.querySelectorAll('.threat-card').length);
    pass(`Briefing arrived: ${nThreats} threat cards rendered`);
  } catch {
    const errText = await page.textContent('#error-box').catch(() => '');
    fail(`Briefing timed out after 120s${errText ? ' — error box: ' + errText.trim() : ''}`);
    await screenshot('briefing-timeout');
    return;
  }

  // Headline should be substantive
  const headline = (await page.textContent('#headline').catch(() => '')).trim();
  if (headline.length > 5) {
    pass(`Headline: "${headline}"`);
  } else {
    fail('Headline empty after briefing render');
  }

  // Map should have live quake dots and threat markers
  const mapCounts = await page.evaluate(() => ({
    quakes: document.querySelectorAll('#quake-layer circle').length,
    threats: document.querySelectorAll('#threat-layer .threat-marker').length,
  }));
  if (mapCounts.threats >= 2) {
    pass(`Map plotted: ${mapCounts.quakes} live quake dots, ${mapCounts.threats} threat markers`);
  } else {
    fail(`Map threat markers missing (quakes=${mapCounts.quakes}, threats=${mapCounts.threats})`);
  }

  await screenshot('briefing');

  // 3. Allocate units: 3 to first threat, 2 to second
  const plusBtns = page.locator('.alloc-plus');
  for (let i = 0; i < 3; i++) await plusBtns.nth(0).click();
  for (let i = 0; i < 2; i++) await plusBtns.nth(1).click();
  await page.waitForTimeout(300);

  const poolLeft = parseInt(await page.textContent('#pool-count'), 10);
  if (poolLeft === 5) {
    pass('Allocation controls work: 5 units committed, 5 in reserve');
  } else {
    fail(`Pool readout unexpected after allocating 5 units: shows ${poolLeft}`);
  }

  // 4. Execute → second forced tool call (judgment)
  await page.click('#execute-btn');
  try {
    await page.waitForFunction(
      () => {
        const panel = document.getElementById('outcome-panel');
        const score = document.getElementById('score-value');
        return panel && !panel.classList.contains('hidden') && /^\d+$/.test((score?.textContent || '').trim());
      }, null,
      { timeout: 120000 }
    );
    const score = (await page.textContent('#score-value')).trim();
    pass(`Judgment arrived: round score ${score}/100`);
  } catch {
    fail('Judgment timed out after 120s — outcome panel never showed a numeric score');
    await screenshot('judgment-timeout');
    return;
  }

  // Assessment prose should be substantive
  const assessment = (await page.textContent('#assessment').catch(() => '')).trim();
  if (assessment.length > 80) {
    pass(`After-action assessment rendered (${assessment.length} chars)`);
  } else {
    fail(`Assessment too short (${assessment.length} chars)`);
  }

  // Per-threat outcome badges
  const badgeCount = await page.evaluate(() => document.querySelectorAll('#outcomes .oc-badge').length);
  if (badgeCount >= 2) {
    pass(`${badgeCount} per-threat outcome badges rendered`);
  } else {
    fail(`Expected outcome badges per threat, found ${badgeCount}`);
  }

  // HUD score updated
  const hudScore = parseInt(await page.textContent('#hud-score'), 10);
  if (hudScore > 0) {
    pass(`Shift score HUD updated: ${hudScore}`);
  } else {
    pass('Shift score HUD reads 0 (judge scored the round 0 — allowed)');
  }

  await screenshot('judgment');

  // 5. Next round button present and labeled
  const nextLabel = (await page.textContent('#next-btn')).trim();
  if (/NEXT ROUND/i.test(nextLabel)) {
    pass('Next-round button ready — round loop intact');
  } else {
    fail(`Unexpected next button label: "${nextLabel}"`);
  }
}

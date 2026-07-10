/**
 * Smoke test: Founders' Court (week-04-demo-02)
 * Tests: topic select → convene → founders stream round 1 arguments + votes
 */

export default async function test(page, { pass, fail, screenshot }) {

  // Wait for topic chips to render (populated by JS on load)
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#topics-grid .topic-chip').length > 0,
      { timeout: 10000 }
    );
    const chipCount = await page.locator('#topics-grid .topic-chip').count();
    pass(`Topic grid loaded: ${chipCount} topics`);
  } catch {
    fail('Topics grid never populated');
    return;
  }

  // Click the first topic chip, then convene
  await page.locator('#topics-grid .topic-chip').first().click();
  await page.waitForTimeout(300);
  await page.click('#btn-convene');

  await screenshot('after-convene');

  // Wait for debate phase to appear
  try {
    await page.waitForFunction(
      () => document.getElementById('phase-debate')?.style.display !== 'none',
      { timeout: 10000 }
    );
    pass('Debate phase started');
  } catch {
    fail('Debate phase never appeared after convening');
    return;
  }

  // Wait for at least one founder to finish their argument (3-4 paragraphs, so 200+ chars)
  try {
    await page.waitForFunction(
      () => {
        const args = document.querySelectorAll('[id^="argument-"]');
        return Array.from(args).some(el => el.textContent.trim().length > 200);
      },
      { timeout: 120000 }
    );
    pass('At least one founder argument streamed');
  } catch {
    fail('No founder argument completed within 120s');
    await screenshot('after-founders-timeout');
    return;
  }

  await screenshot('during-debate');

  // Wait for all 5 vote chips to appear (all founders done with round 1)
  try {
    await page.waitForFunction(
      () => {
        const votes = document.querySelectorAll('[id^="vote-"]');
        const filled = Array.from(votes).filter(el => el.textContent.includes('FOR') || el.textContent.includes('AGAINST'));
        return filled.length >= 3; // at least 3 of 5 voted
      },
      { timeout: 180000 }
    );
    const voteEls = await page.locator('[id^="vote-"]').all();
    let forCount = 0, againstCount = 0;
    for (const el of voteEls) {
      const t = await el.textContent();
      if (t.includes('FOR')) forCount++;
      if (t.includes('AGAINST')) againstCount++;
    }
    pass(`Votes tallied: ${forCount} FOR, ${againstCount} AGAINST`);
  } catch {
    fail('Fewer than 3 founders voted within 3 minutes');
  }

  // Check that extended thinking text appeared for at least one founder
  const thinkingEls = await page.locator('[id^="thinking-text-"]').all();
  let thinkingFound = false;
  for (const el of thinkingEls) {
    const t = await el.textContent();
    if (t.trim().length > 30) { thinkingFound = true; break; }
  }
  if (thinkingFound) {
    pass('Extended thinking visible for at least one founder');
  } else {
    fail('No extended thinking content found in any founder panel');
  }

  await screenshot('after-debate');

  // Round 2 + Chief Justice: wait for the verdict banner, then Marshall's opinion
  try {
    await page.waitForFunction(
      () => document.getElementById('verdict-banner')?.classList.contains('visible'),
      { timeout: 360000 }
    );
    pass('Verdict banner appeared after round 2');
  } catch {
    fail('Verdict banner never appeared (round 2 may have stalled)');
    await screenshot('after-verdict-timeout');
    return;
  }

  try {
    await page.waitForFunction(
      () => (document.getElementById('marshall-opinion')?.textContent.trim().length || 0) > 100,
      { timeout: 240000 }
    );
    const winner = await page.textContent('#marshall-winner');
    pass(`Chief Justice ruled: ${winner.trim().slice(0, 80)}`);
  } catch {
    fail('Marshall opinion never populated');
    await screenshot('after-marshall-timeout');
    return;
  }

  await screenshot('after-marshall');
}

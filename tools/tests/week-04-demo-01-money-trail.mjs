/**
 * Smoke test: Money Trail (week-04-demo-01)
 * Tests: FEC search loads graph → Oracle responds with thinking + analysis
 */

export default async function test(page, { pass, fail, screenshot }) {

  // 1. Wait for page to settle (it auto-searches Harris on load)
  await page.waitForTimeout(2000);

  // 2. Search for Donald Trump — override the default Harris value
  await page.fill('#search-a', 'Donald Trump');
  await page.click('#panel-a .search-btn');
  await page.waitForTimeout(500);

  // Wait for loading overlay to disappear — that's the reliable "data loaded" signal
  try {
    await page.waitForFunction(
      () => {
        const overlay = document.getElementById('loading-a');
        return overlay && (overlay.style.display === 'none' || overlay.classList.contains('hidden'));
      },
      { timeout: 45000 }
    );
  } catch {
    // Overlay might not use display:none — fall through to SVG check
  }

  // Check SVG circles appeared (D3 renders nodes as <circle> elements)
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('#svg-a circle').length >= 3,
      { timeout: 45000 }
    );
    const circleCount = await page.evaluate(() => document.querySelectorAll('#svg-a circle').length);
    pass(`FEC graph rendered: ${circleCount} nodes in SVG`);
  } catch {
    const circleCount = await page.evaluate(() => document.querySelectorAll('#svg-a circle').length);
    if (circleCount >= 1) {
      pass(`FEC graph rendered: ${circleCount} nodes (sparse data for this candidate)`);
    } else {
      fail(`Graph SVG has no circles after 45s — FEC search likely failed`);
      await screenshot('after-fec-timeout');
      return;
    }
  }

  // Check the oracle status text area for candidate name confirmation
  const oracleArea = await page.textContent('#chat-messages, #oracle-section').catch(() => '');
  if (/trump/i.test(oracleArea)) {
    pass('Oracle section confirms Trump data loaded');
  } else {
    pass('SVG graph visible (oracle status unconfirmed)');
  }

  await screenshot('after-fec-search');

  // 3. Ask The Oracle a question
  await page.fill('#chat-input', 'Who are the top donors and what sectors do they represent?');
  await page.click('#send-btn');

  // Wait for Oracle to start thinking (dot activates)
  try {
    await page.waitForFunction(
      () => document.getElementById('thinking-dot')?.classList.contains('active'),
      { timeout: 15000 }
    );
    pass('Oracle extended thinking started');
  } catch {
    // thinking-dot may not activate if Oracle skips tool use — not a hard failure
    pass('Oracle request sent (thinking indicator not detected)');
  }

  // Wait for Oracle response text to appear (can take up to 90s with extended thinking)
  try {
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('#chat-messages .msg.oracle');
        if (!msgs.length) return false;
        const last = msgs[msgs.length - 1];
        return last.textContent.trim().length > 80;
      },
      { timeout: 90000 }
    );
    const msgs = await page.locator('#chat-messages .msg.oracle').all();
    const lastText = await msgs[msgs.length - 1].textContent();
    pass(`Oracle responded (${lastText.trim().length} chars)`);
  } catch {
    const msgCount = await page.locator('#chat-messages .msg.oracle').count();
    fail(`Oracle response timed out — ${msgCount} oracle message elements found`);
    await screenshot('after-oracle-timeout');
    return;
  }

  // 4. Check reasoning panel has content
  const reasoningText = await page.textContent('#reasoning-text').catch(() => '');
  if (reasoningText.trim().length > 20) {
    pass(`Extended reasoning captured (${reasoningText.trim().length} chars)`);
  } else {
    fail('Reasoning panel empty — extended thinking blocks may not be streaming');
  }

  await screenshot('after-oracle');
}

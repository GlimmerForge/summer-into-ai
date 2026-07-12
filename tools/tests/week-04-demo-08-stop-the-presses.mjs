/**
 * Smoke test: Stop the Presses (week-04-demo-08)
 * Tests: start game → AI generates 5 dispatches → decide all (2 PRINT, 3 HOLD)
 *        → run the presses → reveal stamps → streamed town reaction
 */

export default async function test(page, { pass, fail, screenshot }) {

  // Start the game
  await page.click('#start-btn');

  // Wait for the edition to generate: 5 dispatch cards with real headlines
  try {
    await page.waitForFunction(
      () => {
        const cards = document.querySelectorAll('.dispatch-card');
        if (cards.length !== 5) return false;
        const heads = document.querySelectorAll('.dispatch-card .d-headline');
        return heads.length === 5 &&
          [...heads].every(h => h.textContent.trim().length > 3);
      }, null,
      { timeout: 120000 }
    );
    const firstHeadline = await page.textContent('.dispatch-card .d-headline');
    pass(`Edition 1 generated with 5 dispatches: "${firstHeadline.trim().slice(0, 50)}..."`);
  } catch {
    const errText = await page.evaluate(() =>
      document.getElementById('status-err')?.textContent || '(no error box)');
    fail(`Dispatches never loaded (status error: ${errText})`);
    await screenshot('no-dispatches');
    return;
  }

  // Ground truth must NOT be visible on the desk (isTrue/tell hidden until reveal)
  const leaked = await page.evaluate(() => {
    const desk = document.getElementById('desk-screen');
    return /DISINFORMATION|isTrue/i.test(desk ? desk.textContent : '');
  });
  if (leaked) {
    fail('Ground truth (DISINFORMATION/isTrue) leaked onto the desk screen before reveal');
  } else {
    pass('Ground truth hidden on desk screen');
  }

  await screenshot('dispatches-loaded');

  // Decide every dispatch: PRINT the first 2, HOLD the rest
  const cardCount = await page.locator('.dispatch-card').count();
  for (let i = 0; i < cardCount; i++) {
    const card = page.locator('.dispatch-card').nth(i);
    if (i < 2) {
      await card.locator('.btn-print').click();
    } else {
      await card.locator('.btn-hold').click();
    }
  }

  // Run-the-presses button should now be enabled
  try {
    await page.waitForFunction(
      () => !document.getElementById('run-presses-btn')?.disabled, null,
      { timeout: 5000 }
    );
    pass('All 5 dispatches decided — presses ready');
  } catch {
    fail('Run the Presses button never enabled after deciding all dispatches');
    await screenshot('presses-not-ready');
    return;
  }

  await page.click('#run-presses-btn');

  // Reveal: the two printed dispatches must each get a truth stamp
  try {
    await page.waitForFunction(
      () => {
        const reveal = document.getElementById('reveal-screen');
        if (!reveal || !reveal.classList.contains('active')) return false;
        return reveal.querySelectorAll('.stamp.landed').length >= 2;
      }, null,
      { timeout: 60000 }
    );
    const stamps = await page.evaluate(() =>
      [...document.querySelectorAll('#reveal-screen .stamp')].map(s => s.textContent.trim()));
    pass(`Reveal stamps landed: ${stamps.join(' / ')}`);
  } catch {
    fail('Reveal stamps never appeared after running the presses');
    await screenshot('no-stamps');
    return;
  }

  await screenshot('reveal-stamps');

  // Town reaction streams in via SSE — wait for substantive text
  try {
    await page.waitForFunction(
      () => {
        const t = document.getElementById('reaction-text');
        return t && t.textContent.trim().length > 100;
      }, null,
      { timeout: 120000 }
    );
    const reaction = await page.textContent('#reaction-text');
    pass(`Town reaction streamed (${reaction.trim().length} chars): "${reaction.trim().slice(0, 60)}..."`);
  } catch {
    fail('Town reaction never streamed after the reveal');
    await screenshot('no-reaction');
    return;
  }

  // Next Edition button should appear once the reaction finishes
  try {
    await page.waitForFunction(
      () => {
        const b = document.getElementById('next-btn');
        return b && b.style.display !== 'none';
      }, null,
      { timeout: 90000 }
    );
    pass('Next Edition button appeared — game loop continues');
  } catch {
    fail('Next Edition button never appeared after reaction');
  }

  await screenshot('after-reaction');
}

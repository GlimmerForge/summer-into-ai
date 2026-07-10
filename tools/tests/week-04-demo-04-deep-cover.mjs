/**
 * Smoke test: Deep Cover (week-04-demo-04)
 * Tests: start game → AI generates mission → player submits → Washington judges
 */

export default async function test(page, { pass, fail, screenshot }) {

  // Start the game
  await page.click('.btn-begin');

  // Wait for game screen to appear
  try {
    await page.waitForFunction(
      () => {
        const g = document.getElementById('game-screen');
        return g && g.style.display !== 'none';
      },
      { timeout: 10000 }
    );
    pass('Game screen appeared');
  } catch {
    fail('Game screen never appeared after clicking BEGIN');
    return;
  }

  // Wait for mission content to load (AI generates mission 1)
  try {
    await page.waitForFunction(
      () => {
        const mc = document.getElementById('mission-content');
        const sc = document.getElementById('scenario-text');
        return mc && mc.style.display !== 'none' && sc && sc.textContent.trim().length > 30;
      },
      { timeout: 45000 }
    );
    const scenarioText = await page.textContent('#scenario-text');
    pass(`Mission 1 generated: "${scenarioText.trim().slice(0, 60)}..."`);
  } catch {
    const loading = await page.evaluate(() => document.getElementById('mission-loading')?.style.display);
    fail(`Mission never loaded (loading display: ${loading})`);
    await screenshot('after-mission-timeout');
    return;
  }

  await screenshot('mission-loaded');

  // Determine which input section is active (decode vs compose) and fill it
  const decodeVisible = await page.evaluate(() => {
    const s = document.getElementById('decode-section');
    return s && s.style.display !== 'none';
  });

  const composeVisible = await page.evaluate(() => {
    const s = document.getElementById('compose-section');
    return s && s.style.display !== 'none';
  });

  let responded = false;

  if (decodeVisible) {
    // Decode missions require BOTH a written interpretation AND an option selection
    await page.fill('#decode-interpretation', 'Culper Jr. reports British troop strength and officer movements near the docks. A senior officer conferred with a loyalist informant; a troop review is planned. No naval movement detected yet. Recommend continued observation and alerting General Washington of the officer contact.');
    const hasOptions = await page.evaluate(() => {
      const opts = document.getElementById('decode-options');
      return opts && opts.children.length > 0;
    });
    if (hasOptions) {
      await page.locator('#decode-options .option-btn, #decode-options button, #decode-options > *').first().click();
    }
    pass('Decode: filled interpretation + selected option');
    responded = true;
  } else if (composeVisible) {
    await page.fill('#compose-text', 'My Dear Friend, the goods you requested are delayed due to unfavorable weather on the Sound. The merchant vessels cannot make port until the winds shift. I expect delivery within a fortnight. Your obedient servant, Samuel.');
    const hasOptions = await page.evaluate(() => {
      const opts = document.getElementById('compose-options');
      return opts && opts.children.length > 0;
    });
    if (hasOptions) {
      await page.locator('#compose-options .option-btn, #compose-options button, #compose-options > *').first().click();
    }
    pass('Compose: filled message + selected option');
    responded = true;
  }

  // Wait for submit button to become enabled before clicking
  await page.waitForFunction(
    () => !document.getElementById('submit-btn')?.disabled,
    { timeout: 5000 }
  ).catch(() => {});

  if (!responded) {
    fail('Neither decode nor compose section was visible — unknown mission type');
    await screenshot('unknown-mission-type');
    return;
  }

  // Submit response
  await page.click('#submit-btn');

  // Wait for judgment panel to appear with Washington's assessment
  try {
    await page.waitForFunction(
      () => {
        const panel = document.getElementById('judgment-panel');
        return panel && panel.style.display !== 'none';
      },
      { timeout: 10000 }
    );
    pass('Washington judgment panel appeared');
  } catch {
    fail('Judgment panel never appeared after submission');
    await screenshot('after-submit-timeout');
    return;
  }

  // Wait for outcome badge and assessment text
  try {
    await page.waitForFunction(
      () => {
        const badge = document.getElementById('outcome-badge');
        return badge && (
          badge.textContent.includes('SUCCESS') ||
          badge.textContent.includes('PARTIAL') ||
          badge.textContent.includes('FAILURE')
        );
      },
      { timeout: 90000 }
    );
    const outcome = await page.textContent('#outcome-badge');
    pass(`Washington judged: ${outcome.trim()}`);
  } catch {
    fail('Washington outcome badge never populated');
    await screenshot('after-judgment-timeout');
    return;
  }

  // Check assessment text is substantive
  const assessmentText = await page.evaluate(() => {
    // Assessment is in the judgment panel text content beyond the header
    const panel = document.getElementById('judgment-panel');
    return panel ? panel.textContent : '';
  });
  if (assessmentText.trim().length > 150) {
    pass(`Washington assessment received (${assessmentText.trim().length} chars)`);
  } else {
    fail('Assessment text too short — streaming may have failed');
  }

  await screenshot('after-judgment');
}

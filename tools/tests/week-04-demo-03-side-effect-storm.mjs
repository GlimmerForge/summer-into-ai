/**
 * Smoke test: Side Effect Storm (week-04-demo-03)
 * Tests: FDA data load → visualizations render → Claude combo analysis streams
 */

export default async function test(page, { pass, fail, screenshot }) {

  // Use a known-good combo chip to prefill both drugs at once
  await page.click('.chip[onclick*="Lipitor"]');
  await page.waitForTimeout(300);

  const drug1Val = await page.inputValue('#drug1');
  if (drug1Val.toLowerCase().includes('lipitor')) {
    pass(`Drug inputs prefilled: "${drug1Val}"`);
  } else {
    // Fallback: type manually
    await page.fill('#drug1', 'Lipitor');
    await page.fill('#drug2', 'Metformin');
    pass('Drug inputs filled manually');
  }

  // Click ANALYZE DATA to load FDA FAERS data
  await page.click('#analyze-data-btn');

  // Wait for drug cards to appear (FDA data loaded)
  try {
    await page.waitForFunction(
      () => {
        const cards = document.getElementById('drug-cards');
        return cards && cards.children.length > 0;
      },
      { timeout: 30000 }
    );
    const cardCount = await page.evaluate(() => document.getElementById('drug-cards').children.length);
    pass(`FDA data loaded: ${cardCount} drug card(s)`);
  } catch {
    const status = await page.textContent('#status').catch(() => '');
    fail(`FDA data never loaded — status: "${status}"`);
    await screenshot('after-fda-timeout');
    return;
  }

  // Check visualizations appeared
  const vizVisible = await page.evaluate(() => {
    const grid = document.getElementById('viz-grid');
    return grid && grid.style.display !== 'none';
  });
  if (vizVisible) {
    pass('Visualization grid visible');
  } else {
    fail('Visualization grid not shown after FDA load');
  }

  await screenshot('after-fda-load');

  // Wait for ANALYZE COMBO button to be enabled, then click
  try {
    await page.waitForFunction(
      () => !document.getElementById('analyze-combo-btn')?.disabled,
      { timeout: 10000 }
    );
    pass('ANALYZE COMBO button enabled');
  } catch {
    fail('ANALYZE COMBO button remained disabled after data load');
    return;
  }

  await page.click('#analyze-combo-btn');

  // Wait for analysis section to appear and thinking to start
  try {
    await page.waitForFunction(
      () => {
        const section = document.getElementById('analysis-section');
        return section && section.style.display !== 'none';
      },
      { timeout: 10000 }
    );
    pass('Analysis section appeared');
  } catch {
    fail('Analysis section never appeared');
    return;
  }

  // Wait for Claude to produce analysis text (replaces "Waiting for analysis...")
  try {
    await page.waitForFunction(
      () => {
        const el = document.getElementById('analysis-text');
        const t = el?.textContent?.trim() || '';
        return t.length > 100 && !t.includes('Waiting');
      },
      { timeout: 90000 }
    );
    const analysisText = await page.textContent('#analysis-text');
    pass(`Claude analysis received (${analysisText.trim().length} chars)`);
  } catch {
    const t = await page.textContent('#analysis-text').catch(() => '');
    fail(`Analysis timed out — current text: "${t.slice(0, 80)}"`);
    await screenshot('after-analysis-timeout');
    return;
  }

  // Check thinking text was captured
  const thinkingText = await page.textContent('#thinking-text').catch(() => '');
  if (thinkingText.trim().length > 20 && !thinkingText.includes('Waiting')) {
    pass(`Extended thinking captured (${thinkingText.trim().length} chars)`);
  } else {
    fail('Thinking panel empty or still shows placeholder');
  }

  // Wait for the structured storm gauge (second tool call fires after prose completes)
  try {
    await page.waitForFunction(
      () => document.getElementById('storm-gauge')?.style.display !== 'none' &&
            document.getElementById('gauge-level')?.textContent !== '0/10',
      { timeout: 150000 }
    );
    const cat = await page.textContent('#gauge-category');
    const lvl = await page.textContent('#gauge-level');
    pass(`Storm gauge rendered: ${cat.trim()} (${lvl.trim()})`);
  } catch {
    fail('Storm gauge never populated — structured tool call may have failed');
  }

  await screenshot('after-analysis');
}

/**
 * Smoke test: Sworn Testimony (week-04-demo-05)
 * Tests: enter ZIP → dossier/case file loads → ask a question →
 *        witness answer streams in → verifier badge renders a verdict
 *
 * NOTE: Playwright waitForFunction options are the THIRD argument:
 *   page.waitForFunction(fn, null, { timeout: N })
 */

export default async function test(page, { pass, fail, screenshot }) {

  // Enter ZIP and open the case file
  await page.fill('#zip-input', '90210');
  await page.click('#open-file-btn');
  pass('Submitted ZIP 90210');

  // Wait for the dossier (data fetch + Claude synthesis) — generous timeout
  try {
    await page.waitForFunction(
      () => {
        const sec = document.getElementById('dossier-section');
        const txt = document.getElementById('dossier-text');
        return sec && sec.style.display !== 'none' && txt && txt.textContent.trim().length > 100;
      }, null,
      { timeout: 120000 }
    );
    const dossier = await page.textContent('#dossier-text');
    pass(`Case file synthesized (${dossier.trim().length} chars): "${dossier.trim().slice(0, 60)}..."`);
  } catch {
    const err = await page.textContent('#entry-error').catch(() => '');
    fail(`Dossier never loaded (entry error: "${err}")`);
    await screenshot('dossier-timeout');
    return;
  }

  await screenshot('case-file-loaded');

  // Court section should now be visible
  const courtVisible = await page.evaluate(() => {
    const c = document.getElementById('court-section');
    return c && c.style.display !== 'none';
  });
  if (!courtVisible) {
    fail('Cross-examination section never appeared');
    await screenshot('no-court-section');
    return;
  }
  pass('Cross-examination section visible');

  // Ask the witness a question
  await page.fill('#question-input', 'How many EPA toxic release facilities operate in this ZIP code, and what is the median household income here?');
  await page.click('#ask-btn');

  // Wait for a substantive streamed witness answer
  try {
    await page.waitForFunction(
      () => {
        const answers = document.querySelectorAll('.witness-answer');
        if (answers.length === 0) return false;
        const last = answers[answers.length - 1];
        // Answer complete when the streaming cursor is gone and text is substantive
        return !last.classList.contains('cursor') && last.textContent.trim().length > 40;
      }, null,
      { timeout: 120000 }
    );
    const answer = await page.evaluate(() => {
      const answers = document.querySelectorAll('.witness-answer');
      return answers[answers.length - 1].textContent.trim();
    });
    pass(`Witness answered (${answer.length} chars): "${answer.slice(0, 70)}..."`);
  } catch {
    fail('Witness answer never completed streaming');
    await screenshot('witness-timeout');
    return;
  }

  // Wait for the verifier badge with a real verdict
  try {
    await page.waitForFunction(
      () => {
        const badges = document.querySelectorAll('.verdict-badge');
        if (badges.length === 0) return false;
        const last = badges[badges.length - 1];
        return /SUPPORTED|UNVERIFIED|CONTRADICTED/.test(last.textContent);
      }, null,
      { timeout: 120000 }
    );
    const verdict = await page.evaluate(() => {
      const badges = document.querySelectorAll('.verdict-badge');
      return badges[badges.length - 1].textContent.trim();
    });
    pass(`Verifier rendered verdict: ${verdict}`);
  } catch {
    fail('Verifier badge never rendered a verdict');
    await screenshot('verifier-timeout');
    return;
  }

  // Verdict detail (evidence + explanation) should be substantive
  const detailText = await page.evaluate(() => {
    const details = document.querySelectorAll('.verdict-detail');
    return details.length ? details[details.length - 1].textContent.trim() : '';
  });
  if (detailText.length > 40) {
    pass(`Verifier evidence + explanation present (${detailText.length} chars)`);
  } else {
    fail('Verifier detail text too short — structured verdict may have failed');
  }

  // Score box exists and is a number
  const scoreText = await page.textContent('#score-count');
  if (/^\d+$/.test(scoreText.trim())) {
    pass(`Fabrications-exposed score tracking works (score: ${scoreText.trim()})`);
  } else {
    fail(`Score box malformed: "${scoreText}"`);
  }

  await screenshot('after-verdict');
}

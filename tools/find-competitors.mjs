/**
 * tools/find-competitors.mjs
 * Fetch recent posts from known competitor Substack publications and summarize
 * what they've built for a given week. Helps Claude avoid duplicating concepts.
 *
 * Usage:
 *   node tools/find-competitors.mjs --week 2
 *   node tools/find-competitors.mjs --week 2 --pubs jakestrait5,ericsmith,sarahlee
 *
 * Always checks advisoryhour.substack.com (the host publication) for context.
 * Add --pubs to also check specific competitor publications.
 *
 * Output: JSON array of { publication, title, url, date, snippet } printed to stdout.
 *         Exits 0 always — missing competitor data is not fatal.
 */

const args = Object.fromEntries(
  process.argv.slice(2)
    .reduce((acc, v, i, arr) => {
      if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
      return acc;
    }, [])
);

const WEEK     = args.week ? parseInt(args.week, 10) : null;
const EXTRA    = args.pubs ? args.pubs.split(',').map(s => s.trim()) : [];
const PUBS     = ['advisoryhour', ...EXTRA];

// Keywords that suggest a post is a Summer Into AI submission
const KEYWORDS = ['summer into ai', 'summer-into-ai', 'summerintoai'];
if (WEEK) KEYWORDS.push(`week ${WEEK}`, `week-0${WEEK}`, `week${WEEK}`);

async function fetchPub(slug) {
  const url = `https://${slug}.substack.com/api/v1/posts?limit=25&offset=0`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data || []).map(p => ({
      publication: slug,
      title:       p.title || '',
      url:         p.canonical_url || `https://${slug}.substack.com/p/${p.slug}`,
      date:        p.post_date?.slice(0, 10) || '',
      snippet:     (p.subtitle || p.description || '').slice(0, 200),
    }));
  } catch {
    return [];
  }
}

function isRelevant(post) {
  const haystack = (post.title + ' ' + post.snippet).toLowerCase();
  return KEYWORDS.some(kw => haystack.includes(kw));
}

const results = [];
for (const pub of PUBS) {
  process.stderr.write(`Checking ${pub}.substack.com...\n`);
  const posts = await fetchPub(pub);
  const relevant = posts.filter(isRelevant);
  results.push(...relevant);
}

if (results.length === 0) {
  process.stderr.write('\nNo competitor posts found via Substack API.\n');
  process.stderr.write('Tip: use WebSearch with "summer into ai 2026 week N" for broader discovery.\n');
  process.stderr.write('     Then add competitor pub slugs via --pubs for future runs.\n\n');
  console.log(JSON.stringify([], null, 2));
} else {
  process.stderr.write(`\nFound ${results.length} relevant post(s):\n`);
  for (const r of results) {
    process.stderr.write(`  [${r.date}] ${r.publication}: ${r.title}\n  ${r.url}\n`);
  }
  process.stderr.write('\n');
  console.log(JSON.stringify(results, null, 2));
}

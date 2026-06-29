/**
 * tools/validate-links.mjs
 * Check every href in a substack_body.json before publishing.
 *
 * Usage:
 *   node tools/validate-links.mjs --body projects/week-XX/demo-XX/substack_body.json
 *
 * Exits 0 if all links are reachable (2xx/3xx), 1 if any fail.
 */

import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2)
    .reduce((acc, v, i, arr) => {
      if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
      return acc;
    }, [])
);

const BODY = args.body;
if (!BODY) { console.error('Usage: node validate-links.mjs --body path/to/substack_body.json'); process.exit(1); }

const doc = JSON.parse(readFileSync(BODY, 'utf8'));

function extractLinks(node, out = []) {
  if (node.marks) {
    for (const m of node.marks) {
      if (m.type === 'link' && m.attrs?.href) out.push(m.attrs.href);
    }
  }
  if (node.attrs?.href) out.push(node.attrs.href);
  for (const child of node.content || []) extractLinks(child, out);
  return out;
}

const links = [...new Set(extractLinks(doc))];
console.log(`Checking ${links.length} links...\n`);

let failed = 0;
for (const url of links) {
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const ok = r.status < 400;
    console.log(`${ok ? '✓' : '✗'} [${r.status}] ${url}`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`✗ [ERR] ${url}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

console.log('');
if (failed === 0) {
  console.log('All links OK.');
} else {
  console.log(`${failed} link(s) failed — fix before publishing.`);
  process.exit(1);
}

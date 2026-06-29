/**
 * tools/get-vercel-url.mjs
 * Resolve the live production URL for a demo from the Vercel API.
 * Prevents hardcoding wrong URLs in Substack posts.
 *
 * Usage:
 *   node tools/get-vercel-url.mjs --demo projects/week-02-red-white-boom/demo-09-the-broadcast
 *
 * Output: prints "https://..." to stdout
 *
 * Reads projectId from vercel-projects.json, token from Vercel auth.json.
 */

import { readFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2)
    .reduce((acc, v, i, arr) => {
      if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
      return acc;
    }, [])
);

const DEMO = args.demo?.replace(/\\/g, '/').replace(/\/$/, '');
if (!DEMO) { console.error('Usage: node get-vercel-url.mjs --demo projects/week-XX/demo-XX-slug'); process.exit(1); }

const projects = JSON.parse(readFileSync('vercel-projects.json', 'utf8'));
const entry = projects[DEMO];
if (!entry) {
  console.error(`No entry for "${DEMO}" in vercel-projects.json`);
  console.error('Known paths:', Object.keys(projects).join('\n  '));
  process.exit(1);
}

const { projectId, orgId } = entry;

// Token: try the CLI auth file (refreshed automatically by CLI usage)
let token;
try {
  const xdgPath = 'C:/Users/jake2/AppData/Roaming/xdg.data/com.vercel.cli/auth.json';
  token = JSON.parse(readFileSync(xdgPath, 'utf8')).token;
} catch {
  try {
    const roamPath = 'C:/Users/jake2/AppData/Roaming/com.vercel.cli/Data/auth.json';
    token = JSON.parse(readFileSync(roamPath, 'utf8')).token;
  } catch {
    console.error('Could not read Vercel auth token — run `vercel login` or `vercel project ls` to refresh it');
    process.exit(1);
  }
}

// Get latest production deployment
const r = await fetch(
  `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${orgId}&target=production&limit=3&state=READY`,
  { headers: { Authorization: `Bearer ${token}` } }
);

if (!r.ok) {
  const err = await r.json().catch(() => ({}));
  console.error('Vercel API error:', err?.error?.message || r.status);
  process.exit(1);
}

const { deployments } = await r.json();
if (!deployments?.length) {
  console.error('No production deployments found — deploy first');
  process.exit(1);
}

const dep = deployments[0];
const aliases = dep.alias || [];

// Prefer the shortest non-git alias (the stable one, not the per-commit URL)
const stable = aliases
  .filter(a => !a.includes('-git-') && !a.match(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z]+-projects/))
  .sort((a, b) => a.length - b.length)[0];

const url = `https://${stable || aliases[0] || dep.url}`;
console.log(url);

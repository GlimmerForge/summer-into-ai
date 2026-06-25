/**
 * tools/substack/upload-images.mjs
 * Upload screenshots to Substack's image CDN and save the resulting URLs.
 *
 * Usage:
 *   node tools/substack/upload-images.mjs \
 *     --dir projects/week-02/demo-12/public/assets \
 *     --out /tmp/image_urls.json
 *
 * Reads: hero.png, gameplay-1.png, gameplay-2.png from --dir
 * Writes: { heroUrl, gameplay1Url, gameplay2Url } to --out
 *
 * Auth: reads SUBSTACK_SESSION_TOKEN from C:\Users\jake2\.claude\.mcp.json
 * API:  POST https://jakestrait5.substack.com/api/v1/image
 *       body: { "image": "data:image/png;base64,<base64>" }
 *       response: { url: "https://substack-post-media.s3.amazonaws.com/..." }
 *
 * NOTE: Never use curl for this — the base64 arg is too long for the shell arg list.
 *       Always use Node.js fetch.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(
  process.argv.slice(2)
    .reduce((acc, v, i, arr) => {
      if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
      return acc;
    }, [])
);

const DIR = args.dir || 'public/assets';
const OUT = args.out || '/tmp/image_urls.json';
const PUB = 'https://jakestrait5.substack.com';

// Read session token from .mcp.json
const mcpPath = 'C:/Users/jake2/.claude/.mcp.json';
const mcp = JSON.parse(readFileSync(mcpPath, 'utf8'));
const SID = mcp.mcpServers['substack-api'].env.SUBSTACK_SESSION_TOKEN;

async function upload(filename, label) {
  const filepath = join(DIR, filename);
  const bytes = readFileSync(filepath);
  const b64 = bytes.toString('base64');

  console.log(`Uploading ${label} (${Math.round(bytes.length / 1024)}KB)...`);
  const r = await fetch(`${PUB}/api/v1/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `substack.sid=${SID}`,
    },
    body: JSON.stringify({ image: `data:image/png;base64,${b64}` }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Upload failed ${r.status}: ${text}`);
  }

  const json = await r.json();
  console.log(`  → ${json.url}`);
  return json.url;
}

const heroUrl      = await upload('hero.png',      'hero');
const gameplay1Url = await upload('gameplay-1.png', 'gameplay-1');
const gameplay2Url = await upload('gameplay-2.png', 'gameplay-2');

const result = { heroUrl, gameplay1Url, gameplay2Url };
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`\nURLs saved to: ${OUT}`);
console.log(JSON.stringify(result, null, 2));

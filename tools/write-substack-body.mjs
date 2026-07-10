/**
 * tools/write-substack-body.mjs
 * Generate a valid substack_body.json from structured config — no manual JSON editing,
 * no quote corruption, no BOM. Claude fills in the config; this script handles encoding.
 *
 * Usage:
 *   node tools/write-substack-body.mjs --config path/to/body-config.json --out path/to/substack_body.json
 *
 * Config schema (all fields except weekNum/weekTheme/title are optional):
 * {
 *   "weekNum": 2,
 *   "weekTheme": "Red, White & Boom",
 *   "title": "The Broadcast",
 *   "intro": "Plain text intro paragraph (or array of runs — see below)",
 *   "competitor": {
 *     "name": "Independence Town",
 *     "url": "https://...",
 *     "comparison": "took the Revolution theme in the opposite direction..."
 *   },
 *   "howAiWorks": [
 *     [ { "bold": true, "text": "Script generation" }, { "text": " — Claude uses..." } ],
 *     ...
 *   ],
 *   "howAiWorksLinks": [
 *     { "text": "claude-sonnet-4-6", "href": "https://claude.ai" }
 *   ],
 *   "howToPlay": [
 *     "Simple string step",
 *     [ { "text": "Click " }, { "bold": true, "text": "Go On Air" }, { "text": " — then..." } ]
 *   ],
 *   "demoUrl": "https://...",
 *   "codeUrl": "https://...",
 *   "codeLabel": "github.com/... → demo/README.md"
 * }
 *
 * A "run" is: { text, bold?, link? }
 * Inline links in runs: { text: "label", link: "https://..." }
 */

import { readFileSync, writeFileSync } from 'fs';

const args = Object.fromEntries(
  process.argv.slice(2)
    .reduce((acc, v, i, arr) => {
      if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
      return acc;
    }, [])
);

const CONFIG_FILE = args.config;
const OUT_FILE    = args.out;
if (!CONFIG_FILE) { console.error('--config required'); process.exit(1); }
if (!OUT_FILE)    { console.error('--out required'); process.exit(1); }

const cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));

// ── Tiptap node builders ────────────────────────────────────────────────────

function linkAttrs(href) {
  return { href, target: '_blank', rel: 'noopener noreferrer nofollow', class: null };
}

function textNode(text, opts = {}) {
  const marks = [];
  if (opts.bold) marks.push({ type: 'strong' });
  if (opts.em)   marks.push({ type: 'em' });
  if (opts.link) marks.push({ type: 'link', attrs: linkAttrs(opts.link) });
  return marks.length ? { type: 'text', marks, text } : { type: 'text', text };
}

function para(...runs) {
  return { type: 'paragraph', attrs: { textAlign: null }, content: runs.flat() };
}

function h2(text) {
  return { type: 'heading', attrs: { textAlign: null, level: 2 }, content: [{ type: 'text', text }] };
}

function hr() {
  return { type: 'horizontal_rule' };
}

function bulletList(items) {
  return {
    type: 'bullet_list',
    content: items.map(item => ({
      type: 'list_item',
      content: [item],
    })),
  };
}

// Convert a "run spec" (string or run object) to Tiptap text nodes
function runs(spec) {
  if (typeof spec === 'string') return [textNode(spec)];
  if (Array.isArray(spec)) return spec.map(r => textNode(r.text, { bold: r.bold, em: r.em, link: r.link }));
  return [textNode(spec.text, { bold: spec.bold, em: spec.em, link: spec.link })];
}

// ── Build document content ──────────────────────────────────────────────────

const content = [];

// 1. Tagging paragraph (first node — image goes here)
content.push(para(
  textNode(`Week ${cfg.weekNum} of `),
  textNode('Summer into AI 2026', { link: 'https://advisoryhour.substack.com' }),
  textNode(' hosted by '),
  textNode('@advisoryhour', { link: 'https://advisoryhour.substack.com' }),
  textNode(` — theme: ${cfg.weekTheme}.`),
));

// 2. Intro paragraph (second node — gameplay-1 image goes after this)
if (cfg.intro) {
  content.push(para(...runs(cfg.intro)));
}

// 3. Competitor paragraph (early, right after intro)
if (cfg.competitor) {
  const { name, url, comparison } = cfg.competitor;
  content.push(para(
    textNode("Worth noting alongside this: "),
    textNode(name, { link: url }),
    textNode(` ${comparison}`),
  ));
}

// 3.5 Built on (week-4 theme): link the original + list what changed
if (cfg.builtOn) {
  content.push(h2('Built on yesterday — what changed'));
  content.push(para(
    textNode('The original: ', { bold: true }),
    textNode(cfg.builtOn.label, { link: cfg.builtOn.url }),
    ...(cfg.builtOn.note ? [textNode(` — ${cfg.builtOn.note}`)] : []),
  ));
  if (cfg.builtOn.changes?.length) {
    content.push(bulletList(cfg.builtOn.changes.map(item => para(...runs(item)))));
  }
}

// 4. How the AI works
if (cfg.howAiWorks?.length) {
  content.push(h2('How the AI works'));
  content.push(bulletList(cfg.howAiWorks.map(item => para(...runs(item)))));
}

// 5. How to play
if (cfg.howToPlay?.length) {
  content.push(h2('How to play'));
  content.push(bulletList(cfg.howToPlay.map(item => para(...runs(item)))));
}

// 6. Where to play
content.push(h2('Where to play'));

if (cfg.demoUrl) {
  content.push(para(
    textNode('Demo: ', { bold: true }),
    textNode(cfg.demoUrl.replace(/^https?:\/\//, ''), { link: cfg.demoUrl }),
  ));
}

if (cfg.codeUrl) {
  content.push(para(
    textNode('Code & README: ', { bold: true }),
    textNode(cfg.codeLabel || cfg.codeUrl, { link: cfg.codeUrl }),
  ));
}

// 7. Footer
content.push(hr());
content.push(para(
  textNode(`Summer into AI 2026 · Theme ${cfg.weekNum}: ${cfg.weekTheme}`, { em: true }),
));

const doc = { type: 'doc', content };

// Validate
const serialized = JSON.stringify(doc, null, 2);
JSON.parse(serialized); // throws if invalid

// Write without BOM
const utf8NoBom = Buffer.from(serialized, 'utf8');
writeFileSync(OUT_FILE, utf8NoBom);
console.log(`Written ${serialized.length} chars → ${OUT_FILE}`);
console.log('JSON valid ✓');

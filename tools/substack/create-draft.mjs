/**
 * tools/substack/create-draft.mjs
 * Create or update a Substack draft with body text + uploaded images.
 *
 * Usage (create new):
 *   node tools/substack/create-draft.mjs \
 *     --body projects/week-XX/demo-XX/substack_body.json \
 *     --images /tmp/image_urls.json \
 *     --title "Summer into AI 2026: Demo Name" \
 *     --subtitle "One sentence hook."
 *
 * Usage (update existing):
 *   node tools/substack/create-draft.mjs \
 *     --id 203598724 \
 *     --body projects/week-XX/demo-XX/substack_body.json \
 *     --images /tmp/image_urls.json \
 *     --title "Summer into AI 2026: Demo Name" \
 *     --subtitle "One sentence hook."
 *
 * The body JSON should NOT include image nodes — this script inserts them:
 *   - heroUrl:      before the first paragraph (top of post)
 *   - gameplay1Url: after the first paragraph
 *   - gameplay2Url: after the last bullet_list in the "How the AI works" section
 *
 * Auth: reads SUBSTACK_SESSION_TOKEN from C:\Users\jake2\.claude\.mcp.json
 *
 * IMPORTANT: draft_body must be stringified Tiptap JSON (NOT HTML, NOT draft_body_json).
 * Node type names use underscores: bullet_list, list_item, horizontal_rule.
 * Marks: strong (bold), em (italic), link.
 * Every paragraph needs attrs: { textAlign: null }.
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

const BODY_FILE   = args.body;
const IMAGES_FILE = args.images;
const TITLE       = args.title    || 'Summer into AI 2026: Demo';
const SUBTITLE    = args.subtitle || '';
const DRAFT_ID    = args.id       || null;
const PUB         = 'https://jakestrait5.substack.com';
const USER_ID     = 451591601;

if (!BODY_FILE) { console.error('--body is required'); process.exit(1); }
if (!IMAGES_FILE) { console.error('--images is required'); process.exit(1); }

// Read session token
const mcp = JSON.parse(readFileSync('C:/Users/jake2/.claude/.mcp.json', 'utf8'));
const SID = mcp.mcpServers['substack-api'].env.SUBSTACK_SESSION_TOKEN;

// Read body and images
const bodyDoc   = JSON.parse(readFileSync(BODY_FILE, 'utf8'));
const { heroUrl, gameplay1Url, gameplay2Url } = JSON.parse(readFileSync(IMAGES_FILE, 'utf8'));

function imageNode(src) {
  return {
    type: 'captionedImage',
    content: [{
      type: 'image2',
      attrs: {
        src,
        srcNoWatermark: null, fullscreen: null, imageSize: null,
        height: 720, width: 1280, resizeWidth: null, bytes: null,
        alt: null, title: null, type: 'image/png', href: null,
        belowTheFold: false, topImage: false, internalRedirect: null,
        isProcessing: false, align: null, offset: false,
      },
    }],
  };
}

// Insert images into the doc content at the right positions:
//   [0] hero image
//   [1] first paragraph
//   [2] gameplay-1 image
//   ... rest of content ...
//   after last bullet_list before h2("How to play"): gameplay-2 image
function insertImages(doc, heroUrl, gameplay1Url, gameplay2Url) {
  const content = doc.content;

  // Find index of first paragraph
  const firstParaIdx = content.findIndex(n => n.type === 'paragraph');

  // Build new content: hero → first para → gameplay1 → rest
  const pre  = content.slice(0, firstParaIdx);
  const para = content[firstParaIdx];
  const rest = content.slice(firstParaIdx + 1);

  // Find where to insert gameplay-2: after the section containing "How the AI works"
  // Heuristic: find the last bullet_list before the "How to play" heading
  let gameplay2Idx = -1;
  let inAiSection = false;
  for (let i = 0; i < rest.length; i++) {
    const node = rest[i];
    if (node.type === 'heading') {
      const headingText = (node.content || []).map(c => c.text || '').join('');
      if (/how the ai works/i.test(headingText)) { inAiSection = true; continue; }
      if (/how to play/i.test(headingText) && inAiSection) { gameplay2Idx = i; break; }
    }
    if (inAiSection && node.type === 'bullet_list') gameplay2Idx = i + 1;
  }

  const withImages = [
    ...pre,
    imageNode(heroUrl),
    para,
    imageNode(gameplay1Url),
    ...(gameplay2Idx < 0
      ? rest
      : [...rest.slice(0, gameplay2Idx), imageNode(gameplay2Url), ...rest.slice(gameplay2Idx)]),
  ];

  return { ...doc, content: withImages };
}

const docWithImages = insertImages(bodyDoc, heroUrl, gameplay1Url, gameplay2Url);
const bodyStr = JSON.stringify(docWithImages);

console.log(`Body length: ${bodyStr.length} chars, ${docWithImages.content.length} nodes`);

const payload = JSON.stringify({
  type: 'newsletter',
  draft_title: TITLE,
  draft_subtitle: SUBTITLE,
  draft_bylines: [{ id: USER_ID, is_guest: false }],
  audience: 'everyone',
  section_chosen: false,
  draft_body: bodyStr,
});

const url  = DRAFT_ID ? `${PUB}/api/v1/drafts/${DRAFT_ID}` : `${PUB}/api/v1/drafts`;
const method = DRAFT_ID ? 'PUT' : 'POST';

console.log(`${method} ${url}...`);
const r = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `substack.sid=${SID}`,
  },
  body: payload,
});

const json = await r.json();
if (!r.ok) { console.error('Error:', JSON.stringify(json)); process.exit(1); }

const id = json.id || DRAFT_ID;
console.log(`\nDraft ${DRAFT_ID ? 'updated' : 'created'}: ${PUB}/publish/post/${id}`);
console.log(`Body stored: ${(json.draft_body || '').length} chars`);

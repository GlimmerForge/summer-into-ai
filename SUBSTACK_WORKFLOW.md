# Substack Publishing Workflow

Full process for any demo: screenshots → upload → draft creation with images → publish.
**Everything is automated.** Claude runs this end-to-end. No manual steps.

---

## Quick reference — what works, what doesn't

| Task | Works | Fails |
|------|-------|-------|
| Draft body format | Tiptap JSON as string in `draft_body` field | HTML strings, `draft_body_json` object |
| Non-ASCII in body | `jq --slurpfile` + `--ascii-output` + `--data @file` | `BODY=$(cat file)` — corrupts em dashes |
| Image upload | Node.js `fetch` with base64 JSON body | `curl -F` (arg list too long), PowerShell (drops connection) |
| Screenshot images | DOM injection via `page.evaluate()` | Relying on cross-origin image load in headless Playwright |
| Draft creation API | `POST /api/v1/drafts` | MCP tool (raw HTML), PowerShell Invoke-RestMethod |

---

## Step 1 — Take screenshots

**Prerequisites:** `npm install playwright` (once, in scratchpad or any dir), then `npx playwright install chromium`.

Use the reusable script at `tools/substack/screenshot.mjs`. Run it with vercel dev on the demo port:

```bash
cd projects/week-XX/demo-XX-slug
npx vercel dev --yes --listen 3001 &   # or 3002 if 3001 is taken
sleep 7

# Run screenshot tool (from repo root)
node tools/substack/screenshot.mjs \
  --port 3001 \
  --out projects/week-XX/demo-XX-slug/public/assets \
  --hero-image "https://images.metmuseum.org/CRDImages/ad/original/DP215410.jpg"  # Washington Crossing the Delaware
```

The script always:
1. Waits for the cinematic/opening screen (selector: any element with `begin-btn` or `start-btn`)
2. Injects the `--hero-image` URL so the background isn't blank
3. Screenshots hero (1280×720)
4. Clicks begin, waits for mission/game cards (`.assign-btn:not(:disabled)` or `.choice-btn`)
5. Screenshots gameplay-1
6. Optionally: assigns first card, commits, waits for outcome, screenshots gameplay-2

**Known-good Met Museum image URLs by theme:**
- Colonial/Revolution: `https://images.metmuseum.org/CRDImages/ad/original/DP215410.jpg` — Washington Crossing the Delaware (Leutze)
- Battle/action: `https://images.metmuseum.org/CRDImages/dp/original/DP876947.jpg` — News from America, or the Patriots in the Dumps
- Harbor/navy: `https://images.metmuseum.org/CRDImages/dp/original/DP-879-001.jpg`
- Colonial interior: `https://images.metmuseum.org/CRDImages/ep/original/DP-19709-001.jpg`

**Headless Playwright note:** Cross-origin images (Met Museum, external CDN) do NOT load in headless mode. Always inject image URLs via `page.evaluate()` — never rely on the app loading them itself during a screenshot session.

---

## Step 2 — Upload screenshots to Substack CDN

Substack accepts images at `POST /api/v1/image` with a JSON body containing a base64 data URI. **Use Node.js fetch** — curl can't handle the argument list length, PowerShell drops large connections.

Use the reusable script at `tools/substack/upload-images.mjs`:

```bash
node tools/substack/upload-images.mjs \
  --dir projects/week-XX/demo-XX-slug/public/assets \
  --out /tmp/image_urls.json
```

This reads `hero.png`, `gameplay-1.png`, `gameplay-2.png` from `--dir`, uploads each to Substack, and writes the resulting S3 URLs to `--out`.

**Manual one-liner (if needed):**
```js
// In Node.js REPL or .mjs file:
const SID = 's%3A...'; // from C:\Users\jake2\.claude\.mcp.json
const bytes = require('fs').readFileSync('hero.png');
const r = await fetch('https://jakestrait5.substack.com/api/v1/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Cookie': `substack.sid=${SID}` },
  body: JSON.stringify({ image: `data:image/png;base64,${bytes.toString('base64')}` }),
});
const { url } = await r.json();
console.log(url); // https://substack-post-media.s3.amazonaws.com/public/images/...png
```

---

## Step 3 — Write the body JSON

Write `substack_body.json` in the demo folder. **Do not include images** — the publish script inserts them automatically in the right positions.

### Tiptap JSON format (CRITICAL — must match exactly)

Substack uses a customised Tiptap editor. Node type names use **underscores** (not camelCase). Field `draft_body` stores the **stringified** JSON, not a nested object.

```json
{"type":"doc","content":[
  {"type":"paragraph","attrs":{"textAlign":null},"content":[
    {"type":"text","marks":[{"type":"strong"}],"text":"Bold text"},
    {"type":"text","text":" normal text"}
  ]},
  {"type":"heading","attrs":{"textAlign":null,"level":2},"content":[
    {"type":"text","text":"Section heading"}
  ]},
  {"type":"bullet_list","content":[
    {"type":"list_item","content":[
      {"type":"paragraph","attrs":{"textAlign":null},"content":[
        {"type":"text","marks":[{"type":"strong"}],"text":"Bold label"},
        {"type":"text","text":" — description"}
      ]}
    ]}
  ]},
  {"type":"paragraph","attrs":{"textAlign":null},"content":[
    {"type":"text","marks":[{"type":"strong"}],"text":"Link: "},
    {"type":"text","marks":[{"type":"link","attrs":{
      "href":"https://example.com","target":"_blank",
      "rel":"noopener noreferrer nofollow","class":null
    }}],"text":"link text"}
  ]},
  {"type":"horizontal_rule"},
  {"type":"paragraph","attrs":{"textAlign":null},"content":[
    {"type":"text","marks":[{"type":"em"}],"text":"Italic footer"}
  ]}
]}
```

**Node type cheat sheet:**
| Element | `type` | Mark |
|---------|--------|------|
| Paragraph | `paragraph` (+ `attrs:{textAlign:null}`) | — |
| Heading | `heading` (+ `attrs:{textAlign:null,level:2}`) | — |
| Bullet list | `bullet_list` | — |
| List item | `list_item` | — |
| Horizontal rule | `horizontal_rule` | — |
| Bold text | `text` | `strong` |
| Italic text | `text` | `em` |
| Link text | `text` | `link` (attrs: href, target, rel, class) |
| Image | `captionedImage` > `image2` (see below) | — |

**Image node format** (inserted by publish script, shown here for reference):
```json
{"type":"captionedImage","content":[{"type":"image2","attrs":{
  "src":"https://substack-post-media.s3.amazonaws.com/public/images/....png",
  "srcNoWatermark":null,"fullscreen":null,"imageSize":null,
  "height":720,"width":1280,"resizeWidth":null,"bytes":null,
  "alt":null,"title":null,"type":"image/png","href":null,
  "belowTheFold":false,"topImage":false,"internalRedirect":null,
  "isProcessing":false,"align":null,"offset":false
}}]}
```

**Post structure** (body JSON should follow this order — images inserted between these):
```
[hero image]             ← inserted automatically before first paragraph
**Name** is [description].
[gameplay-1 image]       ← inserted automatically after first paragraph
## How the AI works
- bullets
[gameplay-2 image]       ← inserted automatically after AI section
## How to play
- bullets
## Where to play
**Demo:** link
**README:** link
---
*Summer into AI 2026 · Theme N: Name*
```

No "Week N of Summer into AI…" intro. No extra framing. Just the demo.

---

## Step 4 — Create or update the draft

Use the reusable script at `tools/substack/create-draft.mjs`:

```bash
node tools/substack/create-draft.mjs \
  --body projects/week-XX/demo-XX-slug/substack_body.json \
  --images /tmp/image_urls.json \
  --title "Summer into AI 2026: Demo Name" \
  --subtitle "One sentence hook."
```

This creates a new draft and prints the URL. To update an existing draft, add `--id 203598724`.

**Under the hood — what the script does:**
1. Reads the body JSON and the image URLs file
2. Inserts `captionedImage` nodes: hero before paragraph 1, gameplay-1 after paragraph 1, gameplay-2 after the "How the AI works" heading section
3. Calls `jq -n --ascii-output` to escape all non-ASCII to `\uXXXX` (prevents em dash corruption)
4. POSTs to `/api/v1/drafts` (or PUTs to `/api/v1/drafts/{id}`) via `--data @file`
5. Returns the draft URL

**What NOT to do:**
- `BODY=$(cat file)` — corrupts em dashes and other non-ASCII in shell variables
- `Invoke-RestMethod` in PowerShell — drops connection on large bodies
- Pass HTML as `draft_body` — renders as raw code in the editor
- Pass Tiptap JSON as `draft_body_json` — wrong field, ignored by editor

---

## Credentials

- **Session token:** `C:\Users\jake2\.claude\.mcp.json` → `SUBSTACK_SESSION_TOKEN`  
  Valid until Sep 2026. URL-encoded form (with `%3A`, `%2B`) — use as-is in Cookie header.
- **Publication:** `https://jakestrait5.substack.com`
- **User ID:** `451591601`

**If you get 401 (token expired):**
1. Open Chrome → `jakestrait5.substack.com` (already logged in)
2. DevTools → Application → Cookies → copy `substack.sid`
3. URL-encode it: replace `:` → `%3A`, `+` → `%2B`
4. Update `SUBSTACK_SESSION_TOKEN` in `.mcp.json`

---

## Step 5 — Publish checklist

- [ ] Tag **@advisoryhour** in the post (required for competition scoring)
- [ ] Demo is live on Vercel — update "Where to play" URL in the draft
- [ ] Hero image is a dramatic action shot (not a loading spinner or blank screen)
- [ ] All three screenshots show genuine gameplay, not loading states
- [ ] README is pushed to GitHub and the link resolves
- [ ] Delete any broken previous drafts before publishing
- [ ] Draft URL: `https://jakestrait5.substack.com/publish/post/{id}`

### How to tag @advisoryhour

Add a Substack mention at the top of the post body — before the first paragraph. In Tiptap JSON:

```json
{"type":"paragraph","attrs":{"textAlign":null},"content":[
  {"type":"text","text":"Week 2 of "},
  {"type":"text","marks":[{"type":"link","attrs":{
    "href":"https://advisoryhour.substack.com",
    "target":"_blank","rel":"noopener noreferrer nofollow","class":null
  }}],"text":"Summer into AI 2026"},
  {"type":"text","text":" hosted by "},
  {"type":"text","marks":[{"type":"link","attrs":{
    "href":"https://advisoryhour.substack.com",
    "target":"_blank","rel":"noopener noreferrer nofollow","class":null
  }}],"text":"@advisoryhour"},
  {"type":"text","text":" — theme: Red, White & Boom."}
]}
```

Add this as the **first node** in the body doc (before the hero image). Adjust week number and theme name per post.

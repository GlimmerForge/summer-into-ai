# Substack Publishing Workflow

Full process for publishing a demo post: screenshots → draft creation → image upload → publish.

---

## 1. Screenshots (automated via Playwright)

Run this from the demo folder while `npx vercel dev` is running on port 3000:

```bash
cd projects/week-XX/demo-XX-slug
npx playwright install chromium --with-deps
node scripts/screenshot.js
```

The script saves to `public/assets/`:
- `hero.png` — opening cinematic with image loaded
- `gameplay-1.png` — mission selection screen
- `gameplay-2.png` — outcome card with painting

**Screenshot script** (`scripts/screenshot.js` — create per demo):
```js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(4000); // let cinematic image load
  fs.mkdirSync('public/assets', { recursive: true });
  await page.screenshot({ path: 'public/assets/hero.png', fullPage: false });

  // Click past cinematic
  await page.click('#begin-btn');
  await page.waitForTimeout(3000); // let missions load
  await page.screenshot({ path: 'public/assets/gameplay-1.png' });

  // Assign first mission and commit
  await page.click('.assign-btn');
  await page.click('#commit-btn');
  await page.waitForTimeout(6000); // let outcomes + images load
  await page.screenshot({ path: 'public/assets/gameplay-2.png' });

  await browser.close();
  console.log('Screenshots saved to public/assets/');
})();
```

After Vercel deploy, images are at `https://[slug].vercel.app/assets/[image].png`.

---

## 2. Create Substack draft (via curl + jq)

**Never use the MCP tool** — it stores body as raw HTML text.  
**Never use PowerShell Invoke-RestMethod** — it drops the connection on large bodies.  
**Never send HTML** — `draft_body` must be stringified Tiptap JSON (see format below).

Use curl from Git Bash (already installed). Write the body Tiptap JSON to a file first, then:

```bash
SID="s%3A..."  # SUBSTACK_SESSION_TOKEN from C:\Users\jake2\.claude\.mcp.json

# Build payload using --slurpfile + --ascii-output to avoid UTF-8 shell variable corruption.
# NEVER do BODY=$(cat body.json) — em dashes and other non-ASCII corrupt in shell vars.
jq -n --ascii-output \
  --slurpfile body projects/week-XX/demo-XX/substack_body.json \
  --arg title "Summer into AI 2026: Demo Name" \
  --arg subtitle "One sentence hook." \
  '{type:"newsletter",draft_title:$title,draft_subtitle:$subtitle,
    draft_bylines:[{"id":451591601,"is_guest":false}],
    audience:"everyone",section_chosen:false,
    draft_body:($body[0]|tostring)}' > /tmp/substack_payload.json

curl -s -X POST "https://jakestrait5.substack.com/api/v1/drafts" \
  -H "Content-Type: application/json" \
  -H "Cookie: substack.sid=$SID" \
  --data @/tmp/substack_payload.json | jq '{id:.id, body_len:(.draft_body|length)}'
```

Draft opens at: `https://jakestrait5.substack.com/publish/post/{id}`

### Tiptap JSON format (CRITICAL — must match exactly)

Substack uses a customised Tiptap editor. Node type names use **underscores** (not camelCase). Write the body JSON to a file, then pass it as `$BODY` above.

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
    {"type":"text","marks":[{"type":"strong"}],"text":"Link label: "},
    {"type":"text","marks":[{"type":"link","attrs":{
      "href":"https://example.com","target":"_blank",
      "rel":"noopener noreferrer nofollow","class":null
    }}],"text":"link text"}
  ]},
  {"type":"horizontal_rule"},
  {"type":"paragraph","attrs":{"textAlign":null},"content":[
    {"type":"text","marks":[{"type":"em"}],"text":"Italic footer text"}
  ]}
]}
```

**Node type reference:**
| Element | Type name | Mark name |
|---------|-----------|-----------|
| Paragraph | `paragraph` | — |
| Heading | `heading` | — |
| Bullet list | `bullet_list` | — |
| List item | `list_item` | — |
| Horizontal rule | `horizontal_rule` | — |
| Bold | text node | `strong` |
| Italic | text node | `em` |
| Link | text node | `link` |

**Credentials:**
- Session token: `C:\Users\jake2\.claude\.mcp.json` → `SUBSTACK_SESSION_TOKEN` (valid until Sep 2026)
- Publication URL: `https://jakestrait5.substack.com`
- User ID: `451591601`

**If you get 401 (token expired):**
1. Open Chrome → `jakestrait5.substack.com` (logged in)
2. DevTools → Application → Cookies → `jakestrait5.substack.com`
3. Copy `substack.sid` value (the URL-encoded version with `%3A` and `%2B`)
4. Update `SUBSTACK_SESSION_TOKEN` in `.mcp.json`

---

## 3. Add images to the draft

Substack has no image upload API. Two options:

### Option A — After Vercel deploy (preferred)
Images are served from Vercel. In the draft editor, add image blocks and use:
```
https://[slug].vercel.app/assets/hero.png
https://[slug].vercel.app/assets/gameplay-1.png
https://[slug].vercel.app/assets/gameplay-2.png
```

### Option B — Upload via Substack editor (manual)
Open the draft at `jakestrait5.substack.com/publish/post/[id]`, click the image button in the editor toolbar, and upload from `public/assets/`.

### Where images go in the post
Insert images in this order in the editor:
1. Hero image — right after the subtitle, before the first paragraph
2. Gameplay-1 — between the intro paragraph and "How the AI works"
3. Gameplay-2 — between "How to play" and "Where to play"

---

## 4. Publish checklist

- [ ] Demo is live on Vercel — update the URL in "Where to play"
- [ ] Screenshots taken and uploaded
- [ ] Hero image is an action shot (NOT the loading screen)
- [ ] README is pushed to GitHub and the link resolves
- [ ] Delete any previous broken drafts of the same post before publishing

---

## Post format reference

Match existing posts (`projects/week-XX/demo-XX/SUBSTACK_POST.md`). Structure:

```
[Hero image]

**Demo Name** is [description].

[Gameplay screenshot]

[Gameplay screenshot]

## How the AI works
- **Feature** — what it does

## How to play
- step

## Where to play
**Demo:** link
**README:** link

---
*Summer into AI 2026 · Theme N: Name*
```

No "Week N of Summer into AI…" intro paragraph. No extra framing. Just the demo.

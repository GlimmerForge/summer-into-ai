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

## 2. Create Substack draft (via direct API)

**Never use the MCP tool** — it stores body as raw HTML text that shows as code in the editor.

Use this PowerShell script with the session cookie from `.mcp.json`:

```powershell
$sid = "s%3A..." # SUBSTACK_SESSION_TOKEN from C:\Users\jake2\.claude\.mcp.json (URL-encoded)
$pubUrl = "https://jakestrait5.substack.com"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$cookie = New-Object System.Net.Cookie
$cookie.Name = "substack.sid"; $cookie.Value = $sid; $cookie.Domain = "substack.com"
$session.Cookies.Add($cookie)

$html = @"
<p><strong>Demo Name</strong> is [description].</p>
<h2>How the AI works</h2>
<ul>
  <li><strong>Feature</strong> — what it does</li>
</ul>
<h2>How to play</h2>
<ul><li>step</li></ul>
<h2>Where to play</h2>
<p><strong>Demo:</strong> <a href="https://slug.vercel.app">slug.vercel.app</a><br>
<strong>README:</strong> <a href="https://github.com/GlimmerForge/summer-into-ai/blob/master/projects/week-XX/demo-XX/README.md">github link</a></p>
<hr>
<p><em>Summer into AI 2026 · Theme N: Theme Name</em></p>
"@

$payload = [ordered]@{
  type = "newsletter"
  draft_title = "Summer into AI 2026: Demo Name"
  draft_subtitle = "One sentence hook."
  draft_bylines = @(@{ id = 451591601; is_guest = $false })
  audience = "everyone"
  section_chosen = $false
  draft_body = $html
} | ConvertTo-Json -Depth 5

$r = Invoke-RestMethod -Uri "$pubUrl/api/v1/drafts" -Method POST -WebSession $session -ContentType "application/json" -Body $payload
Write-Host "Draft: $pubUrl/publish/post/$($r.id)"
```

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

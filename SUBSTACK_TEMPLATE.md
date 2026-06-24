# Substack Post Template

Reference post: https://jakestrait5.substack.com/p/summer-into-ai-2026-hall-of-the-republic

---

## Quick start for Claude

When the user says "create the Substack draft", do this in order:

1. **Check if a README exists** in the demo folder — if not, create one (see README template below)
2. **Take screenshots** (see Screenshots section below)
3. **Create the draft** using the MCP tool (see Substack section below)
4. **Update SUBSTACK_POST.md** in the demo folder with the final post content

---

## README per demo

Every demo folder must have a `README.md`. It is the canonical reference for the project and the Substack post links to it.

### README template

```markdown
# [Demo Name]

> [One-sentence description]

**Live demo:** [https://[slug].vercel.app](https://[slug].vercel.app)
**Part of:** [Summer into AI 2026](https://advisoryhour.substack.com) · Week [N] · Theme: [Theme]

## What it is

[2-3 sentences on what the demo does and why it's interesting.]

## How to run locally

1. Clone the repo and `cd` into this folder
2. Copy `.env.local.example` to `.env.local` and fill in your API keys
3. `npm install`
4. `node server.js`
5. Open http://localhost:[PORT]

## Environment variables

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `ELEVENLABS_API_KEY` | https://elevenlabs.io (Profile → API Keys) |

## Deploy to Vercel

1. Import the repo into Vercel, set the **Root Directory** to `projects/week-XX/demo-XX-name`
2. Add both environment variables in Project Settings → Environment Variables
3. Deploy — no build step required

## How to play

- [step]
- [step]

## How the AI works

- **[Feature]** — [what it does]
- **[Feature]** — [what it does]

## Tech

- Claude (`claude-sonnet-4-6`) via Anthropic SDK — [what for]
- ElevenLabs (`eleven_turbo_v2_5`) — [what for]
- Vanilla JS + HTML — no framework
```

---

## Screenshots

### How to get them

1. **Start the local server** (`node server.js`) and open the demo in Chrome
2. **Take screenshots manually** using the browser's screenshot tool or Windows Snipping Tool (Win+Shift+S)
3. **Save to `public/assets/`** inside the demo folder (create it if needed):
   - `public/assets/hero.png` — best action shot (not loading screen)
   - `public/assets/gameplay-1.png` — second moment
   - `public/assets/gameplay-2.png` — results or another view
4. **After Vercel deployment**, images are accessible at:
   `https://[slug].vercel.app/assets/[image].png`

### Using images in Substack

Substack does not expose a file-upload API. Two options:
- **Preferred**: deploy to Vercel first, then reference `https://[slug].vercel.app/assets/[image].png` in the draft
- **Alternative**: add images manually through the Substack editor after creating the text draft

---

## Substack draft creation

### Authentication

The session token in this file expires. **Always use the MCP tool** `mcp__substack-api__create_draft_post` — it maintains its own fresh auth. Pass HTML as the body (not Tiptap JSON) for proper paragraph rendering.

```
SUBSTACK_PUBLICATION_URL: https://jakestrait5.substack.com
SUBSTACK_USER_ID:         451591601
```

If you need to use curl directly (for fine-grained Tiptap control), refresh the session token by asking the user to log in to Substack and copy the `substack.sid` cookie from browser DevTools → Application → Cookies.

### MCP tool usage

```
mcp__substack-api__create_draft_post(
  title:    "Summer into AI 2026: [Demo Name]",
  subtitle: "[One sentence hook]",
  body:     "<HTML content — see post structure below>"
)
```

Pass well-structured HTML. The tool renders `<p>`, `<h2>`, `<ul>/<li>`, `<strong>`, `<em>`, `<a>`, `<hr>` correctly.

---

## Post structure (always follow this order)

```html
<p>Week [N] of <a href="https://advisoryhour.substack.com">Summer into AI 2026</a> hosted by <a href="https://advisoryhour.substack.com">@advisoryhour</a> — theme: [Theme Name].</p>

<!-- Hero image — add manually in editor, or use Vercel URL after deploy -->

<p><strong>[Competitor Demo]</strong> by [Author] (<a href="[substack]">@handle</a>) — [What was smart]. [How it redirected you].</p>

<p><strong>[Demo Name]</strong> is [description]. [What you do]. [Tech note].</p>

<!-- Gameplay screenshots — add manually or use Vercel URLs -->

<h2>How the AI works</h2>
<p>[Framing sentence]:</p>
<ul>
  <li><strong>[Feature]</strong> — [what Claude/ElevenLabs does and what the player sees]</li>
</ul>
<p>If the API is unreachable, [fallback description].</p>

<h2>How to play</h2>
<ul>
  <li>[action]</li>
</ul>

<h2>Where to play</h2>
<p><strong>Demo:</strong> <a href="https://[slug].vercel.app">[slug].vercel.app</a></p>
<p><strong>Code &amp; README:</strong> <a href="https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/[week]/[demo]/README.md">github.com/GlimmerForge/summer-into-ai → [demo]/README.md</a></p>

<hr>

<p><em>Summer into AI 2026 · Theme [N]: [Theme] · Competitor: [Demo] by <a href="[substack]">@handle</a></em></p>
```

Note: the Code link should point directly to the `README.md` file in the demo folder, not the repo root. This gives readers a clean project page.

---

## Checklist before publishing

- [ ] `README.md` exists in the demo folder and is pushed to GitHub
- [ ] Hero image is an action shot (not loading/splash screen)
- [ ] Images are in `public/assets/` and pushed (accessible after Vercel deploy)
- [ ] Vercel deployment is live and image URLs resolve
- [ ] Competitor paragraph is specific — read their post, name what was smart
- [ ] Demo link in post is the correct Vercel URL
- [ ] Code link points to `README.md`, not repo root
- [ ] Delete older draft versions in Substack before publishing

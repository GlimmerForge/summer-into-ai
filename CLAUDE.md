# Summer Into AI — Claude Instructions

## Project Overview

Competition repo for the Summer Into AI challenge. Each week has a theme; participants build AI-powered demos and publish them. Demos are standalone Vercel apps (vanilla JS + serverless API functions), no build step required.

**Key files:**
- `COMPETITION_RULES.md` — scoring, submission requirements
- `projects/week-[NN]-[slug]/THEME.md` — weekly theme brief
- `projects/week-[NN]-[slug]/demo-[NN]-[slug]/` — individual demos

---

## One-Shot Ship Workflow

When the user says **"1-shot week N"**, **"ship week N, 2 demos"**, or similar, run this entire pipeline in one pass. The goal: user reviews a deployed demo + a ready-to-publish Substack draft. Nothing manual for them to do.

### Phase 1 — Competitor research (before generating ideas)

Run `find-competitors.mjs` to check known competitor publications:
```bash
node tools/find-competitors.mjs --week N --pubs SLUG1,SLUG2
```
Also use **WebSearch** with `"summer into ai 2026 week N" site:substack.com` to find newer posts not yet in the pub list. Read the resulting posts and build a competitor coverage map. Any concept a competitor has published is off-limits.

### Phase 2 — Generate + build (follow the full Demo Generation Workflow below)

Run the Demo Generation Workflow (Steps 1–8). Build all approved demos in parallel worktrees. Merge all branches into master immediately after agents finish:
```bash
git merge demo-branch-1 demo-branch-2
git push origin master
```

### Phase 3 — Deploy

For each new demo, first check if it has a Vercel project entry in `vercel-projects.json`. If yes, trigger GitHub Actions:
```bash
gh workflow run deploy.yml -f DEMO_KEY=true
```
If no entry exists, create the project via the Vercel API (no GitHub link — prevents auto-deploy overwrites), add it to `vercel-projects.json`, then deploy locally:
```bash
cd projects/week-NN/demo-NN && VERCEL_PROJECT_ID=prj_xxx VERCEL_ORG_ID=team_xxx npx vercel deploy --prod --yes
```

**Shared env vars — manual step required after API project creation:**
Projects created via API do NOT automatically inherit the team's shared env vars (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`). After creating each project:
1. Go to vercel.com/jake-straits-projects/[project-name]/settings/environment-variables
2. Click **Add** → select the shared `ANTHROPIC_API_KEY` (and `ELEVENLABS_API_KEY` if used)
3. Redeploy after linking

Also add to `deploy.yml` inputs and run section so the project can be redeployed via GitHub Actions in the future.

Wait for the workflow to complete:
```bash
gh run watch $(gh run list --workflow=deploy.yml --limit=1 --json databaseId -q '.[0].databaseId')
```

### Phase 4 — Resolve the live URL

After deploy succeeds, get the actual production URL (never guess):
```bash
node tools/get-vercel-url.mjs --demo projects/week-NN-slug/demo-NN-slug
```
Use this URL everywhere — in the Substack body, in the README, in the report to the user.

### Phase 5 — Screenshots

Use the self-serve flag (starts/stops vercel dev automatically):
```bash
node tools/substack/screenshot.mjs \
  --demo-dir projects/week-NN-slug/demo-NN-slug \
  --out projects/week-NN-slug/demo-NN-slug/public/assets
```
If the demo has custom screenshot requirements, use a custom script (see demo-09 for an example).

### Phase 6 — Upload images

```bash
node tools/substack/upload-images.mjs \
  --dir projects/week-NN-slug/demo-NN-slug/public/assets \
  --out /tmp/image_urls.json
```

### Phase 7 — Write the Substack body

Use `write-substack-body.mjs` — never write Tiptap JSON by hand (quote corruption).

1. Write a config file to `/tmp/body-config.json`:
```json
{
  "weekNum": N,
  "weekTheme": "Theme Name",
  "title": "Demo Title",
  "intro": "...",
  "competitor": { "name": "...", "url": "...", "comparison": "took a different approach..." },
  "howAiWorks": [
    [{ "bold": true, "text": "Feature" }, { "text": " — explanation..." }]
  ],
  "howToPlay": ["Step one", [{ "text": "Click " }, { "bold": true, "text": "Button" }, { "text": " — then..." }]],
  "demoUrl": "https://ACTUAL_URL_FROM_STEP_4",
  "codeUrl": "https://github.com/GlimmerForge/summer-into-ai/blob/master/projects/.../README.md",
  "codeLabel": "github.com/GlimmerForge/summer-into-ai → demo-NN-slug/README.md"
}
```

2. Generate the body JSON:
```bash
node tools/write-substack-body.mjs \
  --config /tmp/body-config.json \
  --out projects/week-NN-slug/demo-NN-slug/substack_body.json
```

### Phase 8 — Validate links

```bash
node tools/validate-links.mjs \
  --body projects/week-NN-slug/demo-NN-slug/substack_body.json
```
Fix any failures before continuing. The live demo URL and GitHub URL should both return 200.

### Phase 9 — Create draft

```bash
node tools/substack/create-draft.mjs \
  --body projects/week-NN-slug/demo-NN-slug/substack_body.json \
  --images /tmp/image_urls.json \
  --title "Summer into AI 2026: Demo Title" \
  --subtitle "One sentence hook."
```

### Phase 10 — Commit + push + report

```bash
git add projects/week-NN-slug/demo-NN-slug/
git commit -m "demo-NN: add substack body, assets, README"
git push origin master
```

Report to user:
- Live demo URL
- Substack draft URL (https://jakestrait5.substack.com/publish/post/ID)
- Env vars needed in Vercel project settings
- Any warnings from link validation

---

## Demo Generation Workflow

When the user says anything like:
- "generate 3 demos for week 2"
- "generate 5 ideas for week-02-red-white-boom"
- "make 4 demos for this week's theme"

Follow this protocol exactly:

### Step 1 — Parse the request
- Extract **count** (integer 2–5) and **week** (resolve "week 2" → find `projects/week-02-*/` folder)
- If week folder is ambiguous, list `projects/` and ask

### Step 2 — Load context
Read:
- `COMPETITION_RULES.md`
- `projects/[week-folder]/THEME.md` (if missing, check individual demo READMEs for theme clues)

List `projects/[week-folder]/` to find the **highest existing demo number** — new demos start from the next number.

### Step 3 — Inventory existing demos
Read the `README.md` of every existing demo in the week folder. Build a coverage map:
- What **mechanics** are already used (interrogation, artillery, resource management, etc.)
- What **historical moments/settings** are covered (specific battles, figures, dates)
- What **AI interaction patterns** are already present (tool output, streaming narration, roleplay, etc.)
- What **tone** each demo has (tense, comedic, educational, action, etc.)

Also note any **build ideas listed in THEME.md** — these are the obvious/expected interpretations that other competitors will also attempt. Note them explicitly so they can be avoided or radically subverted.

This map is the constraint: new ideas must not duplicate any slot that's already filled.

### Step 4 — Check competitor posts (if provided)
If the user has pasted any competitor Substack posts or ideas into this conversation, read them and add their concepts to the coverage map as off-limits. The goal is original work that doesn't step on what others have already published or are known to be building.

If no competitor posts were provided, note: *"No competitor posts in context — user can paste Substack links or content to avoid overlap."*

### Step 5 — Generate and rigorously verify ideas

**Quality over quantity is the rule.** The user would rather ship 2 excellent demos than 5 mediocre ones. If fewer than [count] ideas pass all checks, build only the ones that pass and explain why the rest were cut. Never lower the bar to hit a number.

Generate candidate ideas, then score each one against all five checks before accepting it:

---

**Check 1 — Theme fit (Strong / Weak / Fail)**
Does this connect to the weekly theme in a way that's *specific and surprising*? Surface-level connections fail. "A game set in 1776" isn't on-theme for "8-Bit America" unless it also has the NES aesthetic. The connection should make someone say "oh that's clever" not "yeah obviously."

---

**Check 2 — Not a THEME.md suggestion (Original / Derivative / Copy)**
Look at the "Build Ideas" list in THEME.md. If the idea is essentially one of those suggestions with minor changes, it fails unless there's a genuinely wild spin that makes it unrecognizable. A "branching choice game about civic tradeoffs" when the theme already lists that is a copy. A "branching choice game where the AI gaslights you about historical facts and you have to catch it lying" is a spin. The spin must be substantial — a different adjective isn't enough.

---

**Check 3 — No competitor overlap (Clear / Overlaps)**
Compare against any competitor posts in context. If someone has already published or is building the same core concept, this idea fails regardless of execution quality.

---

**Check 4 — AI depth (Deep / Shallow / Slop)**
This is the most important check. The AI integration must be **non-trivial and multi-layered**. Ask: if you removed the AI calls, would the core experience collapse? If yes, it passes. If the AI is decoration (text generation that could be pre-written), it fails.

What **passes**: AI drives game state through structured tool output; AI plays an adversarial or evaluative role; multiple AI calls with different purposes (generate content + evaluate player response); AI adapts to player behavior; streaming AI creates real-time tension; AI generates procedural content the player must then interact with.

What **fails** ("AI slop"): single text generation with no effect on game state; "chat with a historical figure" with no stakes or mechanics; AI generates a list the player reads; AI as a hint system tacked onto an otherwise non-AI game; simple prompt → paragraph response with no structure.

---

**Check 4b — AI tool diversity (Pushing Boundaries / Comfortable / Repetitive)**
Claude + one structured tool call is the floor, not the ceiling. Before settling on a concept, ask: is there a second AI system that would make this dramatically better? Available keys: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`. But don't default to ElevenLabs just because it's available — only add it if voice genuinely changes the experience.

AI tools and techniques worth considering (pick the one that fits, don't stack them all):
- **Claude extended thinking** — for puzzles or evaluations where deliberate multi-step reasoning is part of the experience
- **Claude multi-turn conversation with memory** — maintain state across a session so the AI genuinely remembers and adapts
- **Streaming SSE** — real-time tension; the AI typing on screen feels alive in ways a static response never does
- **Claude vision** — accept a user-uploaded image as input (photo of a handwritten note, a map, a drawing) and react to it
- **Web search / real-time data** — pull live data (stock prices, weather, news) and have Claude reason about it in context
- **Image generation** (DALL-E via OpenAI or similar if key is available) — generate a visual the player reacts to
- **Whisper / speech input** — let the player speak their answer instead of typing
- **Multi-model pipeline** — Claude generates content, a second model (ElevenLabs, image gen) transforms it; the output of one feeds the input of the next

The bar: at least one AI call should feel like something you couldn't have done two years ago. If the whole demo could have been built with GPT-3 in 2022, push harder.

---

**Check 5 — Memorability (Memorable / Generic / Forgettable)**
Would someone describe this demo to a friend a week later? Could it be in a "coolest AI projects" roundup? The combination of theme + mechanic + AI integration should feel like something no one has done before. If the pitch sounds like a school project ("learn about the Revolution with AI!"), it fails. If it sounds like something you'd screenshot and share, it passes.

The highest bar: would a non-technical person who doesn't care about AI find this fun or surprising on its own merits? If yes, it's a winner. If the only impressive thing is "wow the AI did that," it's not memorable enough.

---

If an idea fails any check, replace it and try again. Show the full scorecard to the user before building — they can override a rejection if they want to.

For each accepted idea define:
- **Folder:** `demo-[NN]-[slug]` (zero-padded number, e.g. `demo-08-liberty-forge`)
- **Title:** display name
- **Pitch:** one sentence that would make someone want to try it
- **Mechanic:** what the user does, what the loop is, what makes it replayable
- **AI usage:** every endpoint, what each one does, what Claude returns, how it changes game state — be specific
- **Why it passes:** one line per check explaining why it cleared the bar

### Step 7 — Build each demo in parallel
Call the **Agent tool with `isolation: "worktree"`** for each demo simultaneously. Each sub-agent gets a self-contained brief (see template below). Run all agents in the same message block so they execute in parallel.

**Sub-agent brief template:**

> You are building a complete demo for the Summer Into AI competition. Create all files at `projects/[week-folder]/[demo-folder]/`.
>
> **Idea:** [full spec from Step 3]
>
> **Theme summary:** [paste key parts of THEME.md]
>
> **Rules constraints:** Build artifact + public demo URL required. Must use Claude AI meaningfully.
>
> **Code pattern** (follow exactly):
>
> `api/chat.js`:
> ```js
> import Anthropic from '@anthropic-ai/sdk';
> const client = new Anthropic(); // picks up ANTHROPIC_API_KEY from env
> export const config = { api: { bodyParser: true } };
> export default async function handler(req, res) {
>   if (req.method !== 'POST') return res.status(405).end();
>   const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
>   // ... call client.messages.create with model: 'claude-sonnet-4-6'
>   // use tools + tool_choice for structured output
> }
> ```
>
> **Required files — build all of them:**
> - `index.html` — complete app, vanilla JS, CSS in `<style>`, JS in `<script>`, calls `/api/` endpoints, themed UI matching the week's aesthetic, fully working
> - `api/chat.js` — Vercel serverless function (ESM, Node.js); add other api files as needed
> - `package.json` — `{ "type": "module", "dependencies": { "@anthropic-ai/sdk": "^0.39.0" } }` — **no `scripts` block** — a `"start"` script makes Vercel treat the project as a Node.js server instead of a static site
> - `vercel.json` — always include both `outputDirectory` and `ignoreCommand`:
>   ```json
>   {
>     "outputDirectory": ".",
>     "functions": { "api/*.js": { "maxDuration": 30 } },
>     "ignoreCommand": "exit 0"
>   }
>   ```
>   `outputDirectory: "."` prevents Vercel from serving `public/` as the root (404). `ignoreCommand: "exit 0"` always cancels Vercel's auto-deploy — GitHub Actions in `.github/workflows/deploy.yml` handles all deployments selectively based on which demo folders changed. After importing a new demo to Vercel, also add it to `vercel-projects.json`.
> - `.gitignore` — `node_modules/`, `.env.local`, `.vercel/`, `server.js` — **never commit server.js** — Vercel detects it and treats the project as a Node.js server, breaking static file serving
> - `.env.local` — `ANTHROPIC_API_KEY=your_key_here` (placeholder only)
> - `README.md` — title, one-line description, how AI powers it, local dev instructions, Vercel deploy instructions
>
> Write complete, working code. When done, commit all files with a clear message.

### Step 8 — Report results
When all agents finish, output:

```
## Generated Demos

| Demo | Folder | Branch |
|------|--------|--------|
| [Title] | projects/[week]/[demo]/ | [branch-name] |
...

To review a demo: git checkout [branch-name]
To keep it: git checkout master && git merge [branch-name]
To keep all: git merge [branch1] [branch2] [branch3]
```

---

## Demo File Conventions

- **Entry point:** `index.html` at the demo root (not in `public/`)
- **API functions:** `api/*.js` — Vercel serverless, ESM, always check `process.env.ANTHROPIC_API_KEY`
- **Model:** always `claude-sonnet-4-6`
- **No build step** — plain HTML/CSS/JS only, no React, no Vite, no webpack
- **Static assets:** embed as data URIs or put in `public/`
- **Local dev:** demos that need a server use a `server.js` that proxies `/api/` routes

---

## Week Folder Naming

`week-[NN]-[theme-slug]` — e.g. `week-02-red-white-boom`  
Demo folders: `demo-[NN]-[slug]` — zero-padded, e.g. `demo-08-liberty-forge`

---

## Vercel Deployment

Each demo is its own Vercel project importing the same GitHub repo.

**When importing a new demo into Vercel:**
1. New project → Import Git Repository (same repo as all others)
2. Set **Root Directory** to `projects/week-[NN]-[slug]/demo-[NN]-[slug]`
3. No build command, no output directory override needed
4. Add environment variables: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` (if used)
5. Deploy

---

## Publishing workflow (after building a demo)

When the user says "create the Substack draft", "get images", "push", or similar, do ALL of this — do not ask the user to do any step manually:

1. **Create `README.md`** in the demo folder if it doesn't exist — see `SUBSTACK_TEMPLATE.md` for the README template. It must include local dev instructions, env vars table, and Vercel deploy steps.

2. **Take screenshots** using `tools/substack/screenshot.mjs` (automated Playwright, no manual steps):
   ```bash
   # Start vercel dev first
   cd projects/[week]/[demo] && npx vercel dev --yes --listen 3001 &
   sleep 7
   # Take screenshots (pass a relevant Met Museum URL for the hero)
   node tools/substack/screenshot.mjs \
     --port 3001 \
     --out projects/[week]/[demo]/public/assets \
     --hero-image "https://images.metmuseum.org/CRDImages/ad/original/DP215410.jpg"
   ```
   Known-good Met Museum URLs are listed in `SUBSTACK_WORKFLOW.md`.

3. **Upload screenshots** to Substack CDN using `tools/substack/upload-images.mjs`:
   ```bash
   node tools/substack/upload-images.mjs \
     --dir projects/[week]/[demo]/public/assets \
     --out /tmp/image_urls.json
   ```

4. **Write `substack_body.json`** in the demo folder — Tiptap JSON (no image nodes, those are inserted automatically). Include a tagging paragraph as the **first node** in the doc:
   ```json
   {"type":"paragraph","attrs":{"textAlign":null},"content":[
     {"type":"text","text":"Week N of "},
     {"type":"text","marks":[{"type":"link","attrs":{"href":"https://advisoryhour.substack.com","target":"_blank","rel":"noopener noreferrer nofollow","class":null}}],"text":"Summer into AI 2026"},
     {"type":"text","text":" hosted by "},
     {"type":"text","marks":[{"type":"link","attrs":{"href":"https://advisoryhour.substack.com","target":"_blank","rel":"noopener noreferrer nofollow","class":null}}],"text":"@advisoryhour"},
     {"type":"text","text":" — theme: [Theme Name]."}
   ]}
   ```
   Then the rest of the content (intro paragraph, How the AI works, How to play, Where to play, footer). See `SUBSTACK_WORKFLOW.md` for the full Tiptap format spec.

5. **Create the draft** using `tools/substack/create-draft.mjs`:
   ```bash
   node tools/substack/create-draft.mjs \
     --body projects/[week]/[demo]/substack_body.json \
     --images /tmp/image_urls.json \
     --title "Summer into AI 2026: Demo Name" \
     --subtitle "One sentence hook."
   ```
   The script inserts the three images in the correct positions and handles all encoding correctly. It prints the draft URL when done.

6. **Git commit and push** — include the demo folder, README, assets, substack_body.json.

7. **Tell the user the Vercel env vars** needed for their project settings and the draft URL to review.

**Full details, Tiptap format reference, credential locations, and troubleshooting:** `SUBSTACK_WORKFLOW.md`  
**README template for each demo:** `SUBSTACK_TEMPLATE.md`

**NEVER use the MCP `create_draft_post` tool** — it renders HTML as raw text in the editor.  
**NEVER use PowerShell Invoke-RestMethod** for image uploads — drops connection on large bodies.  
**NEVER do `BODY=$(cat file)`** — corrupts em dashes and other non-ASCII in shell variables.

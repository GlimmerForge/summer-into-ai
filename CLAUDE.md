# Summer Into AI — Claude Instructions

## Project Overview

Competition repo for the Summer Into AI challenge. Each week has a theme; participants build AI-powered demos and publish them. Demos are standalone Vercel apps (vanilla JS + serverless API functions), no build step required.

**Key files:**
- `COMPETITION_RULES.md` — scoring, submission requirements
- `projects/week-[NN]-[slug]/THEME.md` — weekly theme brief
- `projects/week-[NN]-[slug]/demo-[NN]-[slug]/` — individual demos

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

**Check 5 — Memorability (Memorable / Generic / Forgettable)**
Would someone describe this demo to a friend a week later? Could it be in a "coolest AI projects" roundup? The combination of theme + mechanic + AI integration should feel like something no one has done before. If the pitch sounds like a school project ("learn about the Revolution with AI!"), it fails. If it sounds like something you'd screenshot and share, it passes.

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
> - `package.json` — `{ "type": "module", "dependencies": { "@anthropic-ai/sdk": "^0.39.0" } }`
> - `vercel.json` — always include `outputDirectory: "."` so Vercel serves `index.html` from the demo root (not from `public/` if that folder exists):
>   ```json
>   { "outputDirectory": ".", "functions": { "api/*.js": { "maxDuration": 30 } } }
>   ```
> - `.gitignore` — `node_modules/`, `.env.local`, `.vercel/`
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

When the user says "create the Substack draft", "get images", "push", or similar:

1. **Create `README.md`** in the demo folder if it doesn't exist — see `SUBSTACK_TEMPLATE.md` for the README template. It must include local dev instructions, env vars table, and Vercel deploy steps.
2. **Take screenshots** manually (Win+Shift+S or browser screenshot) and save to `demo-folder/public/assets/hero.png` + `gameplay-1.png`. After Vercel deploy, they're at `https://[slug].vercel.app/assets/[image].png`.
3. **Git commit and push** — include the demo folder, README, vercel.json, and assets.
4. **Create Substack draft** via the MCP tool `mcp__substack-api__create_draft_post` with HTML body (the curl session token expires; MCP tool has fresh auth). The "Code & README" link in the post should point to the README.md file directly, not the repo root.
5. **Tell the user the Vercel env vars** needed for their project settings.

Full details and post structure in `SUBSTACK_TEMPLATE.md`.

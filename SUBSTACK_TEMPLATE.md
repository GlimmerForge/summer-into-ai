# Demo README Template

Every demo folder must have a `README.md`. Copy this template and fill it in.
The Substack post links directly to this file, so keep it accurate.

```markdown
# [Demo Name]

> [One-sentence description]

**Live demo:** [https://[slug].vercel.app](https://[slug].vercel.app)  
**Part of:** [Summer into AI 2026](https://advisoryhour.substack.com) · Week [N] · Theme: [Theme]

## What it is

[2–3 sentences on what the demo does and why it's interesting.]

## How to run locally

1. Clone the repo and `cd` into this folder
2. Copy `.env.local.example` to `.env.local` and fill in your API keys
3. `npm install`
4. `npx vercel dev --yes`
5. Open http://localhost:3000

## Environment variables

| Variable | Required | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | https://console.anthropic.com |
| `ELEVENLABS_API_KEY` | Optional | https://elevenlabs.io → Profile → API Keys |

## Deploy to Vercel

1. Import repo into Vercel, set **Root Directory** to `projects/week-XX/demo-XX-slug`
2. Add environment variables in Project Settings → Environment Variables
3. Deploy — no build step required

## How to play

- [step]
- [step]

## How the AI works

- **[Feature]** — [what it does]
- **[Feature]** — [what it does]

## Tech

- Claude (`claude-sonnet-4-6`) via Anthropic SDK — [what for]
- ElevenLabs — [what for, or omit if unused]
- Vanilla JS + HTML — no framework, no build step
```

---

For the full publishing workflow (screenshots, image upload, Substack draft creation), see `SUBSTACK_WORKFLOW.md`.

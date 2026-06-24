# Drafted

> You hold the deciding vote on the Committee of Five. Edit the actual Declaration of Independence. Hear it read aloud.

**Live demo:** [drafted-delta.vercel.app](https://drafted-delta.vercel.app) *(update after deploy)*
**Part of:** [Summer into AI 2026](https://advisoryhour.substack.com) · Week 2 · Theme: Red, White & Boom

## What it is

Drafted is an interactive editing session of the real Declaration of Independence. You play the Committee of Five — Jefferson, Franklin, Adams, Sherman, and Livingston — and cast the deciding vote on five historically contested passages, each a real moment where principle met politics in Philadelphia, June–July 1776. Three distinct AI voices carry the experience: one narrator sets each scene, one reads the contested Declaration text aloud, and the committee reacts in real time to every choice you make. A live 13-colony scoreboard shows who you're keeping on board and who you're losing — and why.

## How to run locally

1. Clone the repo and `cd` into this folder:
   ```
   cd projects/week-02-red-white-boom/demo-07-drafted
   ```
2. Copy `.env.local.example` to `.env.local` and fill in your API keys (see below)
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   node server.js
   ```
5. Open http://localhost:3007

No Vercel CLI or build step required. The server auto-loads `.env.local`.

## Environment variables

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys |

Create `.env.local` in this folder:
```
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=sk_...
```

## Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `projects/week-02-red-white-boom/demo-07-drafted`
3. Add environment variables in Project Settings → Environment Variables:
   - `ANTHROPIC_API_KEY`
   - `ELEVENLABS_API_KEY`
4. Deploy — no build command needed, output directory is `.`

## How to play

- Click **Begin Deliberations** — this also unlocks the audio context
- Listen as Josh narrates the scene and Adam reads the Declaration passage aloud
- Read the contested phrase and choose between the two historical options
- Watch the 13-colony scoreboard pulse and shift — see which colonies you gained and which you lost, and why
- Hear the committee's immediate reaction, voiced by Daniel after Claude generates it
- Five passages in total — your final document is compared to Jefferson's original at the end

## How the AI works

Three ElevenLabs voices and Claude handle every moment:

- **Scene narration** — Josh (`TxGEqnHWrfWFTfGW9XjX`) reads the context paragraph when each passage loads
- **Declaration reading** — Adam (`pNInz6obpgDQGcFmaJgB`) reads the actual contested text from Jefferson's draft
- **Committee reaction** — `claude-sonnet-4-6` streams a 2-sentence reaction from the five real committee members, grounded in their documented personalities; Daniel (`onwK4e9ZLuTAKqWW03F9`) then voices it aloud
- **Colony scoreboard** — 13 dots update live with historically grounded reasons for each shift

If the Anthropic API is unreachable, pre-written fallback reactions drawn from the historical record keep the game running. If ElevenLabs is unreachable, the text still streams silently.

## The five passages

1. **The Nature of Truth** — Jefferson's "sacred & undeniable" vs. Franklin's "self-evident"
2. **The Source of Tyranny** — charging King and Parliament both vs. the King alone
3. **Foreign Soldiers** — keeping the full Hessian mercenary charge vs. softening the language
4. **Our British Brethren** — keeping Jefferson's emotional appeal to the British people vs. cutting it
5. **The Slavery Clause** — keeping Jefferson's condemnation of the Atlantic slave trade vs. striking it entirely

## Tech

- **Claude** (`claude-sonnet-4-6`) via `@anthropic-ai/sdk` — committee reaction streaming
- **ElevenLabs** (`eleven_turbo_v2_5`) — three distinct voices, fetched server-side
- **Web Audio API** — client-side audio playback (bypasses browser autoplay restrictions)
- **Vanilla JS + HTML** — no framework, single-file frontend
- **Node.js HTTP server** (`server.js`) — local dev shim for Vercel-style API routes

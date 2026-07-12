# Class Action

Litigate a real class action lawsuit built from real CFPB consumer complaints — pick your exhibits, survive the AI defense attorney's attack, write a closing rebuttal, and let an AI jury award (or deny) damages.

**Built on: [Complaint Storm (Week 3)](../../week-03-datapunk/demo-06-complaint-storm/)** — Complaint Storm visualized CFPB complaints as a particle storm with a split-screen AI debate. Class Action reuses its CFPB fetching layer and evolves the concept into a full trial with player agency: the AI's arguments now respond to *your* strategic choices, and a second AI adjudicates the outcome.

## How the AI powers it

Three distinct Claude calls, each with a different job:

1. **Discovery clustering** (`api/discover.js`) — fetches up to 400 real complaints from the CFPB public API (code reused from Complaint Storm), then a **forced tool call** clusters them into 5-6 candidate exhibit patterns with real narrative excerpts, complaint counts, strength scores, and legal theories. This is procedural content the player must then strategize over.
2. **AI defense attorney** (`api/defense.js`) — a **streaming SSE call with extended thinking**. The defense attacks the player's *specific* three exhibit choices by name ("Exhibit B rests on 14 narratives, none alleging actual damages..."). The thinking stream is exposed in a collapsible "intercepted strategy notes" panel.
3. **AI jury** (`api/jury.js`) — a **forced tool call** returns a structured verdict: SUSTAINED/DISMISSED per exhibit with reasons, a dollar damages award, and a foreperson's statement. It explicitly weighs the player's written rebuttal against the defense's attacks — a rebuttal that answers the defense wins more.

Remove any of the three calls and the game collapses: the AI generates the evidence, plays the adversary, and judges the outcome.

## How to play

1. Enter a company name (try **Equifax**, **Wells Fargo**, **Coinbase**, **Navient**).
2. Review the 5-6 patterns AI co-counsel found in the real complaint data. Select exactly **3** as Exhibits A, B, C — strong-but-few vs weak-but-many is a real tradeoff.
3. Watch the defense attorney attack your specific exhibits in real time (expand the strategy notes to see its reasoning).
4. Write a closing rebuttal that answers the defense's attacks.
5. The jury rules on each exhibit and the damages counter rolls up.

## Local dev

```bash
cd projects/week-04-built-on-yesterday/demo-07-class-action
# put a real key in .env.local
npx vercel dev --yes --listen 3001
# open http://localhost:3001
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | All three Claude calls (`claude-sonnet-4-6`) |

The CFPB Consumer Complaint API requires no key.

## Deploy to Vercel

1. New Vercel project → import this repo.
2. Set **Root Directory** to `projects/week-04-built-on-yesterday/demo-07-class-action`.
3. No build command, no output directory override.
4. Add env var `ANTHROPIC_API_KEY`.
5. Deploy.

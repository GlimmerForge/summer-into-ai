# Sons of Liberty

> Boston, 1775. You are Samuel Adams. Run the revolutionary underground.

**Part of:** [Summer into AI 2026](https://advisoryhour.substack.com) · Week 2 · Theme: Red, White & Boom

## What it is

A resource-management strategy game where you direct the Sons of Liberty through six rounds of covert missions in colonial Boston. Claude generates the missions and narrates every outcome with period-accurate detail. ElevenLabs scores each scene with contextual sound effects. This is the first demo in the series to add a full visual layer — scene imagery pulled from the Metropolitan Museum of Art's open-access collection of 18th-century paintings.

## How to run locally

1. Clone the repo and `cd` into this folder
2. Copy `.env.local.example` to `.env.local` and fill in your API keys
3. `npm install`
4. `npx vercel dev`
5. Open http://localhost:3000

## Environment variables

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `ELEVENLABS_API_KEY` | https://elevenlabs.io → Profile → API Keys |

Images come from the Met Museum Open Access API — no key required.

## Deploy to Vercel

1. Import the repo into Vercel, set **Root Directory** to `projects/week-02-red-white-boom/demo-12-sons-of-liberty`
2. Add environment variables in Project Settings → Environment Variables
3. Deploy — no build step required

## How to play

- The opening cinematic sets the scene at the Green Dragon Tavern
- Each round Claude generates 3 mission cards — low risk, medium, and high stakes
- Click mission cards to assign your agents (each mission costs members, intel, and money)
- Hit **Commit Missions** to send them out
- Watch outcome cards reveal with narrative, resource gains/losses, and a period painting
- Reach 100 influence in 6 rounds to trigger the shot heard round the world

## How the AI works

- **Mission generation** — Claude uses tool use (`/api/missions.js`) to produce 3 structured mission cards referencing real people (Paul Revere, Joseph Warren, William Dawes), real locations (Green Dragon Tavern, Faneuil Hall, Province House), and period-accurate stakes
- **Mission outcomes** — each committed mission fires a parallel Claude call (`/api/outcome.js`) that narrates success or failure in 18th-century prose, and generates a `scene_prompt` — a vivid oil-painting description used to search the Met Museum collection
- **Scene imagery** — `/api/scene.js` uses the `scene_prompt` to query the Met Museum Open Access API, returning a matching period painting or engraving from their 400,000+ public-domain collection. We tested HF (FLUX.1-schnell) and Pollinations.ai first — this is the first demo to integrate image sourcing; the Met gave us reliable, rate-limit-free historical art
- **Sound effects** — ElevenLabs sound generation (`/api/sfx.js`) produces contextual audio: colonial tavern ambience on load, triumphant fife-and-drum on mission success, tense strings on failure. Falls back silently if the key is absent

## Tech

- Claude (`claude-sonnet-4-6`) via Anthropic SDK — mission generation + outcome narration with tool use
- ElevenLabs (`/v1/sound-generation`) — dynamic contextual SFX
- Metropolitan Museum of Art Open Access API — period-accurate imagery, no auth required
- Vanilla JS + HTML canvas — no framework, no build step

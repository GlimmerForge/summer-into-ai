# Sons of Liberty

**Boston, 1775. You are Samuel Adams. Run the revolutionary underground.**

Governor Gage's troops fill the streets. The port is closed. The Sons of Liberty meet in secret at the Green Dragon Tavern. You have six rounds to build enough influence to trigger the shot heard round the world.

## The Game

Assign agents to missions across colonial Boston. Each round Claude generates 3 mission cards — one safe, one risky, one desperate. Commit your agents and watch the outcomes unfold with AI-generated cinematic imagery and dynamic sound effects.

- **Win:** Reach 100 influence in 6 rounds
- **Lose:** Run out of members (captured or fallen)
- **Partial:** End round 6 short of 100 — the revolution is delayed

## Four AI Integrations

### 1. Claude — Mission Generation (`/api/missions.js`)
Uses Claude's tool use to generate 3 structured mission cards each round. Each mission references real people (Paul Revere, Joseph Warren, William Dawes), specific Boston locations (Green Dragon Tavern, Faneuil Hall, Province House), and the escalating tension of 1775. Tool use ensures perfectly structured JSON every time.

### 2. Claude — Mission Outcomes (`/api/outcome.js`)
Each assigned mission fires a parallel Claude call that narrates the outcome with period language and atmospheric detail. Claude also generates a `scene_prompt` — a vivid 18th-century oil painting description used for image generation.

### 3. fal.ai — Cinematic Scene Images (`/api/scene.js`)
Uses `fal-ai/flux/schnell` to generate historically-styled oil painting images for each moment: the opening tavern scene, every mission outcome, the victory at Lexington, or the defeat in a dark Boston alley. Images display with a slow Ken Burns zoom animation.

### 4. ElevenLabs — Dynamic Sound Effects (`/api/sfx.js`)
Generates contextual audio using ElevenLabs' sound generation API: colonial tavern ambience on load, triumphant fife-and-drum on success, tense strings on failure, musket volley on victory. Falls back gracefully if the key is not set.

## Local Development

```bash
npx vercel dev
```

Requires a `.env.local` file with:

```
ANTHROPIC_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
FAL_KEY=your_key_here
```

The game works without `FAL_KEY` (CSS gradients replace images) and without `ELEVENLABS_API_KEY` (silent but fully playable).

## Deploy to Vercel

```bash
vercel deploy --prod
```

Set environment variables in the Vercel dashboard:
- `ANTHROPIC_API_KEY` — required for mission and outcome generation
- `FAL_KEY` — optional, enables cinematic scene images
- `ELEVENLABS_API_KEY` — optional, enables dynamic sound effects

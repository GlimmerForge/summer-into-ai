# Ride for Liberty

**Week 2 · Theme: Red, White & Boom · Summer Into AI 2026**

A pseudo-3D rocket runner built entirely in a single HTML canvas file. Pick a founding father — Franklin, Washington, or Revere — saddle up a rocket, and blast down three lanes of a giant scrolling American flag toward July 4th, 1776. Smash powder kegs for firework explosions. Dodge Redcoat soldiers or lose a life. Battle Hymn of the Republic plays on dual-oscillator synth the whole way.

📖 [Read the Substack post](https://jakestrait5.substack.com/p/summer-into-ai-2026-ride-for-liberty)

🎮 [Play it live](https://boom-or-bust-plum.vercel.app)

## How it was built

Claude built the entire game through conversation — ElevenLabs is the only runtime AI call. Key systems:

| System | What Claude built |
|--------|-------------------|
| Pseudo-3D renderer | Sprite-scaling projection via `FOCAL/z` — obstacles shrink from vanishing point and grow as they approach the player |
| Fireworks | Line-trail particles (`px→x`, `py→y` per frame) with `ctx.shadowBlur` glow; three burst types: peony, chrysanthemum, ring |
| Background shells | Shells launch upward with spark trails, detect apex by sign change on `vy`, then burst into 55–90 particles |
| Flag ground | 13 red/white stripes scroll with perspective depth haze; blue canton with 5-pointed stars tiles vertically |
| Audio engine | Dual-oscillator notes (square + detuned sawtooth) for Battle Hymn of the Republic; synthesized boom, hit, switch, and boost sounds |
| Redcoat AI | Obstacle type spawned in random lanes at increasing probability; triggers screen shake, red flash, and `playHit()` on collision |
| ElevenLabs voices | Three founding fathers with distinct voice IDs; intro line on character select, start/win/lose lines per run |

## Controls

| Key / Input | Action |
|-------------|--------|
| ← → arrows | Switch lanes |
| SPACE | Rocket boost (orange bar recharges over time) |
| Fly into kegs 🛢 | Smash for fireworks, score, and speed boost |
| Dodge redcoats 🪖 | Costs a life — you have 3 |
| Click character card | Hear their intro voice line |

## AI integration

ElevenLabs TTS fires via a Vercel serverless function at `/api/speak` that keeps the key server-side and returns `audio/mpeg` directly. Voice lines trigger at:

- **Title screen** — first click plays selected character's intro; switching characters plays their intro
- **Game start** — each character has a unique launch line
- **Win** — fired when July 4th, 1776 is reached
- **Lose** — fired when all three lives are lost to Redcoats

If ElevenLabs is unreachable the game runs silently with no gameplay impact.

## Deploy to Vercel

1. Import `GlimmerForge/summer-into-ai` in Vercel
2. Set **Root Directory** to `projects/week-02-red-white-boom/demo-02-boom-or-bust`
3. Set **Framework** to `Other`
4. Add environment variable: `ELEVENLABS_API_KEY`
5. Deploy

## Files

| File | Purpose |
|------|---------|
| `public/index.html` | The entire game — canvas, audio, projection, all sprites |
| `api/speak.js` | Serverless proxy for ElevenLabs TTS |
| `api/pitch.js` | Unused (Shark Tank judge leftover from earlier demo) |
| `vercel.json` | Sets 30s timeout on serverless functions |

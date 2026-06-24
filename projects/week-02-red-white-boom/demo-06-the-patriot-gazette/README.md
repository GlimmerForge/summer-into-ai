# The Patriot Gazette — Harbor Defense 1776

Harbor defense artillery game set on July 4, 1776. Command a bronze cannon on the ramparts of Fort Liberty as the British fleet sails in from the horizon. Claude Haiku streams live battlefield commentary token-by-token as you play.

**Live demo:** [patriot-gazette.vercel.app](https://patriot-gazette.vercel.app)

---

## How to play

- **Move mouse** — point anywhere on the harbor; the cannon auto-calculates the ballistic arc
- **Click** — fire; the cannonball lands exactly where your cursor is
- **HP bars** — green → orange → red above each ship; sloops sink in 2 hits, frigates 4, man-of-war 6
- **Enemy fire** — British ships return fire at Fort Liberty; watch the fort HP bar (bottom-left)
- **Three waves** — sloops → frigates → man-of-war; clear all three for victory fanfare and fireworks

---

## How it works

All game logic runs in a single `index.html` canvas file with no build step.

**Ballistic auto-range** — on every `mousemove` the game solves the quadratic ballistic equation to find the exact launch angle for the cannonball to reach your cursor:

```
A = 0.5 * g * dx² / v²
D = dx² - 4A(A - dy)
k = (-dx + √D) / (2A)
angle = atan(k)
```

**AI narration** — each hit, sink, and harbor breach POSTs a context string to `/api/narrate`, a Vercel serverless function that calls `client.messages.stream()` with Claude Haiku and pipes each token back as `text/event-stream`. The game reads the stream with `response.body.getReader()` and renders words as they arrive at the bottom of the screen. Narration is fully optional — if the API key isn't set the game plays identically without it.

**Audio** — entirely procedural Web Audio API. No sound files:
- Ocean waves: pink noise with LFO swell
- Cannon boom: 5-layer (sub-bass pitch-drop, triangle waveshaper, crack noise, brown rumble, stone echo)
- Ship sink: gurgle bandpass filter rising 250→1400 Hz
- Fort hit: thud + crumble noise
- Victory fanfare: C–E–G–C triangle oscillators staggered 0.24s apart

---

## Run locally

```bash
cd projects/week-02-red-white-boom/demo-06-the-patriot-gazette
npm install
ANTHROPIC_API_KEY=your_key node server.js
# open http://localhost:3006
```

---

## Deploy to Vercel

Set root directory to `projects/week-02-red-white-boom/demo-06-the-patriot-gazette`, framework to **Other**, and add one environment variable:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | your Anthropic API key |

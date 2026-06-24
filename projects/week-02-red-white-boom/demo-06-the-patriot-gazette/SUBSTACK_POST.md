# Summer into AI 2026: The Patriot Gazette

![Fort Liberty at dusk, cannon aimed at the British fleet](assets/pg-hero.png)

**The Patriot Gazette** is a harbor defense artillery game set on July 4, 1776. You command a bronze cannon on the ramparts of Fort Liberty as the British fleet sails in from the horizon. Move your mouse anywhere on screen — the cannon auto-calculates the exact ballistic arc — then click to fire. British warships advance in three waves: sloops first, then frigates, then a man-of-war. Each class returns fire. Sink them all before they breach the harbor.

The AI element is a **spoken quote banner**: Josh — an ElevenLabs voice — reads a curated Revolutionary War-era quote aloud at the start of each wave, between waves, and on victory. A newspaper masthead strip at the top types the quote character-by-character while Josh speaks it, then fades. Quotes rotate through Patrick Henry, Thomas Paine, Benjamin Franklin, Nathan Hale, George Washington, Samuel Adams, and Thomas Jefferson.

The entire audio layer is procedural Web Audio API — rolling ocean waves with an LFO swell, a five-layer cannon boom with stone-echo reflections, an underwater gurgle as ships sink, stone crumble when the fort takes a hit, and a C–E–G–C bugle fanfare on victory. No sound files.

![Cannonball in flight with glowing ember trail](assets/pg-firing.png)

![British sloops with HP bars advancing on the harbor](assets/pg-ships.png)

## How the AI works

ElevenLabs Josh speaks a new quote at every major game moment — wave start, wave clear, and victory:

- **ElevenLabs TTS** — on each trigger the game POSTs the quote text to /api/speak, a Vercel serverless function that calls the ElevenLabs API (eleven_turbo_v2_5 model, Josh voice). The browser fetches the returned audio/mpeg blob, wraps it in an Audio element, and plays it. Quotes only speak after the first click so browser autoplay restrictions never block anything
- **Ballistic auto-range** — on every mousemove the game solves the quadratic ballistic equation to find the exact launch angle that lands the cannonball at your cursor; you aim by pointing, not by guessing the arc height

If the ElevenLabs key isn't set the game plays identically — the banner still types the quote, just silently.

## How to play

- **Move mouse** — point anywhere on the harbor; the cannon barrel auto-aims to the perfect ballistic angle
- **Click** — fire; the ball arcs to land exactly where your cursor is
- **HP bars** — green → orange → red above each ship; sloops sink in 2 hits, frigates 4, man-of-war 6
- **Enemy fire** — British ships return fire at Fort Liberty; watch the fort HP bar bottom-left
- **Three waves** — sloops → frigates → man-of-war; clear all three for the bugle fanfare and fireworks

## Where to play

**Demo:** [patriot-gazette.vercel.app](https://patriot-gazette.vercel.app)
**README:** [github.com/GlimmerForge/summer-into-ai — The Patriot Gazette](https://github.com/GlimmerForge/summer-into-ai/blob/master/projects/week-02-red-white-boom/demo-06-the-patriot-gazette/README.md)

---

*Summer into AI 2026 · Theme 2: Red, White & Boom*

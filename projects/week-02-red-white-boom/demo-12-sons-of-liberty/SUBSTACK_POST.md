# Summer into AI 2026: Sons of Liberty

![Sons of Liberty opening cinematic — Green Dragon Tavern, Boston 1775](assets/hero.png)

**Sons of Liberty** is a six-round covert strategy game set in colonial Boston, 1775. You play Samuel Adams, directing a network of patriots through secret missions — gathering intelligence, recruiting dockworkers, intercepting British dispatches, printing revolutionary pamphlets — while Governor Gage's troops tighten their grip on the city. Reach 100 influence in six rounds to trigger the shot heard round the world.

![Mission selection screen with three AI-generated cards](assets/gameplay-1.png)

![Outcome card with period painting and mission narrative](assets/gameplay-2.png)

## How the AI works

This is our first demo to add a full image layer alongside the text and audio:

- **Claude — Mission Generation** — each round Claude uses tool use to produce three structured mission cards referencing real people (Paul Revere, Joseph Warren, William Dawes), real Boston locations (Green Dragon Tavern, Faneuil Hall, Province House), and escalating stakes. Tool use guarantees valid JSON every time
- **Claude — Outcome Narration** — each committed mission fires a parallel Claude call that narrates success or failure in period-accurate 18th-century prose, and writes a `scene_prompt` — a vivid oil-painting description used to pull matching imagery
- **Scene Imagery** — this demo marks our first attempt at AI image generation. We started with Hugging Face's FLUX.1-schnell model, then Pollinations.ai — both hit network and rate-limit issues under load. We landed on the Met Museum Open Access API: 400,000+ public-domain 18th-century paintings and engravings, free with no auth, no rate limits, and Claude's scene_prompt drives the search so each outcome pulls a historically relevant piece
- **ElevenLabs — Dynamic Sound Effects** — contextual audio for every moment: colonial tavern ambience on load, triumphant fife-and-drum on success, tense strings on failure, musket volley and church bells on victory. Falls back silently if the key is absent

## How to play

- Click **Begin the Mission** at the opening cinematic to unlock audio and start the game
- Each round shows three mission cards — one safe, one risky, one desperate. Each costs members, intel, and money
- Click a card to assign agents, then hit **Commit Missions**
- Outcome cards reveal one by one with Claude's narration, resource changes, and a period painting from the Met
- Reach 100 influence across six rounds to win — or watch the network fall

## Where to play

**Demo:** [sons-of-liberty.vercel.app](https://sons-of-liberty.vercel.app)
**README:** [github.com/GlimmerForge/summer-into-ai — Sons of Liberty](https://github.com/GlimmerForge/summer-into-ai/blob/master/projects/week-02-red-white-boom/demo-12-sons-of-liberty/README.md)

---

*Summer into AI 2026 · Theme 2: Red, White & Boom*

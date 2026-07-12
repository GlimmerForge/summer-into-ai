# Stop the Presses

**A 1776 disinformation game: you run a Philadelphia broadsheet, British intelligence runs the lies — print the truth, catch the plants, or become Lord Howe's favorite paper.**

> **Built on: [The Broadside (Week 2)](../../week-02-red-white-boom/demo-04-the-broadside/)** — Week 2's Broadside was a July-4th-1776 printing press. Stop the Presses keeps the letterpress soul and turns it into a game with teeth: the same print shop is now the front line of an information war, with AI generating both the news and the enemy propaganda you have to detect.

## The game

Philadelphia, July 1776. Three weekly editions. Each edition, five dispatches arrive at your shop — express riders, ship captains, letters from the South. Three are genuine reports drawn from real July 1776 history (the Dunlap broadside, Howe's fleet at Staten Island, the statue of George III pulled down for musket balls). Two are British disinformation: seductive, printable lies, each hiding exactly one subtle tell — an impossible travel time, a source that couldn't know, a detail that contradicts known fact.

Mark every dispatch **PRINT** or **HOLD**. Spend up to two **INVESTIGATE** tokens per edition to send your riders out for a period-voice verification report. Then **RUN THE PRESSES**: your edition renders as an actual broadsheet page, and each printed story gets stamped — CONFIRMED TRUE (circulation up) or a big red DISINFORMATION (reputation down, with the tell you should have caught). The town reacts in a streamed tavern vignette. After three editions the town renders its verdict, from *Voice of the Revolution* down to *British Mouthpiece*.

## How the AI powers it

Three distinct Claude roles, all `claude-sonnet-4-6`:

1. **`api/dispatches.js` — the adversary.** A forced tool call (`deliver_dispatches`) generates each edition: exactly 3 genuine dispatches grounded in a curated real-events brief for that week of July 1776, and exactly 2 British plants, each required to embed one subtle detectable flaw. `isTrue` and `tell` come back as hidden ground truth the frontend keeps off-screen until the reveal. Every game is a fresh, unique mix — remove the AI and there is no game.
2. **`api/investigate.js` — your riders.** Given a dispatch plus its secret ground truth, Claude writes a 1-2 sentence period verification report that leans toward the truth without ever stating it ("No rider from Amboy has heard a word of it, and the packet named has not made port these three weeks").
3. **`api/reaction.js` — the town.** After the presses run, Claude streams (SSE) a coffee-house vignette reacting to exactly what you printed and what it turned out to be — praise for scoops, public shame for printed plants, a nod when a rival prints the lie you held.

## Run locally

```bash
cd projects/week-04-built-on-yesterday/demo-08-stop-the-presses
npm install
# put a real key in .env.local
npx vercel dev --yes --listen 3001
# open http://localhost:3001
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | All three Claude endpoints (dispatch generation, investigation, town reaction) |

## Deploy to Vercel

1. New Vercel project → Import this GitHub repo
2. Set **Root Directory** to `projects/week-04-built-on-yesterday/demo-08-stop-the-presses`
3. No build command needed (static site + serverless functions)
4. Add env var `ANTHROPIC_API_KEY`
5. Deploy

## Smoke test

```bash
node tools/test-demo.mjs --url https://YOUR_DEPLOY_URL --demo week-04-demo-08-stop-the-presses
```

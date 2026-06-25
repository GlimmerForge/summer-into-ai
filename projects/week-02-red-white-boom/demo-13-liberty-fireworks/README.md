# Liberty Fireworks

> Walk a colonial town, buy firework shells from period shops, wire your own fuses — then launch while Claude's Town Council judges you live.

**Week 2 — Red, White & Boom** | Summer Into AI 2026

---

## How AI Powers It

Three distinct Claude calls drive the full experience:

| Endpoint | What Claude Does |
|---|---|
| `POST /api/brief` | Uses tool calling (`set_show_brief`) to generate a structured show brief: occasion, required colors, min shells, finale type, crowd size, council note — all in character |
| `POST /api/shopkeeper` | Streams in-character shopkeeper advice (Old Jacob / Mistress Hawthorne / Young Thomas) tailored to the player's brief and current inventory |
| `POST /api/evaluate` | Streams a vivid colonial crowd reaction + Town Council verdict while fireworks are still exploding on screen |

Remove any one of these and the game loses a core layer: the shopping advice goes generic, the show has no stakes, and the whole loop collapses.

---

## How to Play

1. **Read the Brief** — the Town Council tells you what they want: specific colors, minimum shells, and a required finale type
2. **Visit 3 Shops** — buy shells from the Powder House, dyes from the Ironmonger, fuses and racks from the General Store (budget: 60 Liberty Dollars)
3. **Load Your Mortars** — drag shells into mortar slots, apply dyes to change colors, set fuse timing with Quick/Slow fuses
4. **Light the Fuse** — watch your show fire left-to-right while Claude streams the crowd reaction live
5. **See Your Verdict** — SPLENDID / ADEQUATE / DISAPPOINTING / A DISGRACE based on how well you met the brief

---

## Local Dev

```bash
cd projects/week-02-red-white-boom/demo-13-liberty-fireworks
cp .env.local .env.local   # edit with your real key
npx vercel dev --listen 3001
# open http://localhost:3001
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — get one at console.anthropic.com |

---

## Vercel Deployment

1. Import this repo to Vercel as a new project
2. Set **Root Directory** to `projects/week-02-red-white-boom/demo-13-liberty-fireworks`
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy — no build command needed

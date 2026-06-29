# The Culper Ring

**You are Agent 711 — George Washington's codename.** Decode intercepted Culper Ring spy dispatches, identify the hidden mission, and make the operational call. Claude generates authentic period intelligence using real 18th-century cipher conventions, then judges whether your spycraft would have kept the network alive.

## How AI Powers It

Two Claude endpoints drive the entire experience:

- **`/api/dispatch`** — Generates a period-authentic intelligence dispatch written in actual Culper Ring tradecraft: cover names (`C——r Jr.` for Townsend, `711` for Washington), numbered location codes (`10`=NYC, `20`=Setauket, `30`=Oyster Bay), and coded language (`the medicine` = invisible ink, `wool` = troops). Returns the cipher text, plain English translation, three operational choices, the correct answer, and a historical context note. Uses `tool_choice: any` for guaranteed structured output.

- **`/api/evaluate`** — Receives the player's decision and evaluates it against the correct operational choice. Returns a narrative outcome (what happened), intelligence status, network health (`active`/`compromised`/`captured`), and a debrief line explaining the right call.

## How to Play

1. Read the intercepted dispatch using the permanent codebook sidebar
2. Decode what the cipher says — cover names, location codes, tradecraft language
3. Choose one of three operational responses (A, B, or C)
4. See the plain-English translation revealed alongside your outcome
5. 3+ correct decisions out of 4 = Yorktown. Fewer = the network is compromised.

## Local Dev

```bash
cd projects/week-02-red-white-boom/demo-15-the-culper-ring
cp .env.local .env.local  # add your real key
npx vercel dev --listen 3001
```

Then open `http://localhost:3001`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — get one at console.anthropic.com |

## Vercel Deploy

1. New project → Import Git Repository (this repo)
2. Set **Root Directory** to `projects/week-02-red-white-boom/demo-15-the-culper-ring`
3. No build command needed
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy

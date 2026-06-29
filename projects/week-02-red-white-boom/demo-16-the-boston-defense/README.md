# The Boston Defense

**Boston Massacre trial, 1770. You are John Adams — defending 8 British soldiers against a city that wants them hanged.**

Cross-examine 5 witnesses (Claude plays each one, streaming live testimony). Then 12 colonial jurors deliberate your case.

---

## How AI Powers It

Three Claude endpoints work together to create an interactive 18th-century courtroom:

| Endpoint | What it does |
|----------|-------------|
| `POST /api/testify` | Claude streams witness testimony via SSE — each witness has a distinct personality and responds to your chosen defense strategy |
| `POST /api/crossexamine` | Claude evaluates your cross-examination question using structured tool output: credibility shift, key point landed, opportunity missed, witness reaction in character |
| `POST /api/jury` | Claude runs 12 historically-plausible colonial jurors with individual names, occupations, votes, and reasoning — structured tool output returns verdict and narrative |

AI is load-bearing at every stage. Remove the Claude calls and there is no game.

---

## Witnesses

1. **Nathan Maverick** — grief-stricken brother of victim Samuel Maverick, age 17
2. **Capt. Thomas Preston** — commanding officer of the accused soldiers
3. **Richard Palmes** — merchant, stood beside Preston that night
4. **Dr. Benjamin Church** — prominent Patriot physician, hostile to the defense
5. **Pvt. Hugh Montgomery** — one of the accused soldiers, frightened, desperate

---

## Local Development

### Prerequisites
- Node.js 18+
- Vercel CLI: `npm i -g vercel`

### Setup
```bash
cd projects/week-02-red-white-boom/demo-16-the-boston-defense
cp .env.local .env.local  # edit to add your real API key
npm install
npx vercel dev --yes --listen 3001
```

Then open `http://localhost:3001`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key — get one at console.anthropic.com |

---

## Vercel Deployment

1. Go to [vercel.com/new](https://vercel.com/new) and import this repository
2. Set **Root Directory** to `projects/week-02-red-white-boom/demo-16-the-boston-defense`
3. Leave Build Command and Output Directory at defaults (vercel.json handles it)
4. Add environment variable: `ANTHROPIC_API_KEY` = your key
5. Deploy

---

## Historical Note

The real Boston Massacre trial ended December 5, 1770. Six soldiers were acquitted; two convicted of manslaughter only. John Adams later called it "one of the best pieces of service I ever rendered my country." The trial established that American courts were independent from mob pressure — the first real independence engine.

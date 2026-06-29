# The French Alliance — Mission to Paris, 1778

Benjamin Franklin, Paris 1778. Write diplomatic arguments to four French court factions — Claude plays every one of them. Win the Treaty of Alliance in four rounds or the Revolution fails.

## How AI Powers It

Every argument you deliver triggers a `POST /api/negotiate` call. Claude adopts the full persona of the targeted faction (Louis XVI, Vergennes, the Philosophes, or the Merchant Consortium) and uses structured tool output (`evaluate_diplomacy`) to return:

- **`alignment_shift`** (-20 to +30): how much your argument moved them
- **`what_worked`**: what resonated with their interests
- **`what_failed`**: what missed or backfired
- **`counter_demand`**: what they want in exchange for support
- **`faction_voice`**: 1-2 sentences in period-accurate character

A second endpoint (`POST /api/signing`) generates a 3-sentence historical narration of the outcome once all four rounds are complete.

The AI integration is non-trivial: Claude plays four distinct adversarial roles with different personalities, evaluates arguments honestly (a weak argument can lower alignment), and its structured output directly drives game state.

## Game Mechanics

- Pick an opening diplomatic gambit (sets context for all Claude calls)
- 4 rounds: each round, choose one faction and write a free-text argument
- Win condition: weighted average alignment ≥ 60 after 4 rounds
  - King Louis XVI: 40% weight (starts at 30%)
  - Foreign Minister Vergennes: 35% weight (starts at 45%)
  - Philosophe Circle: 15% weight (starts at 60%)
  - Merchant Consortium: 10% weight (starts at 25%)
- Bonus: a signing ceremony narration from Claude if you win

## Local Development

### Requirements

- Node.js 18+
- An Anthropic API key

### Setup

```bash
cd projects/week-02-red-white-boom/demo-14-the-french-alliance
npm install
cp .env.local .env.local   # edit with your real key
```

### Run locally (option 1: Vercel CLI)

```bash
npx vercel dev --yes --listen 3001
```

Then open http://localhost:3001

### Run locally (option 2: lightweight server)

Create a `server.js` in the demo folder (not committed — it's gitignored):

```js
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import 'dotenv/config';

// Minimal proxy: serve index.html + route /api/* to handlers
const server = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const name = req.url.split('?')[0].replace('/api/', '');
    const mod = await import(`./api/${name}.js`);
    return mod.default(req, res);
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(readFileSync('./index.html'));
});
server.listen(3001, () => console.log('http://localhost:3001'));
```

Then: `node server.js`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key from console.anthropic.com |

## Vercel Deployment

1. Go to vercel.com → New Project → Import Git Repository
2. Select this repo
3. Set **Root Directory** to `projects/week-02-red-white-boom/demo-14-the-french-alliance`
4. No build command needed
5. Add environment variable: `ANTHROPIC_API_KEY`
6. Deploy

The `vercel.json` handles routing: `outputDirectory: "."` serves `index.html` as root, and `api/*.js` functions handle the API calls.

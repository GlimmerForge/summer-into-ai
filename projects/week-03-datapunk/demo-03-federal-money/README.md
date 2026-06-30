# Federal Money Finder

Enter any company name and instantly see every federal contract they received (2022–2025), broken down by agency, dollar amount, and contract description — then interrogate the data with AI-powered follow-up questions.

## How AI Powers It

- **USASpending.gov API** fetches real government contract data (no key required — public API)
- **Claude with extended thinking** writes a full Federal Spending Intelligence Report: contractor profile, top contracts, agency breakdown, what the contracts reveal, and patterns/anomalies
- **Multi-turn Q&A** — after the dossier, ask any follow-up question in plain English and Claude answers instantly using the contract data as context

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key — used for both extended-thinking dossier generation and follow-up Q&A |

## Local Dev

```bash
# Install dependencies
npm install

# Add your Anthropic key
cp .env.local .env.local   # edit ANTHROPIC_API_KEY

# Start local dev server (Vercel CLI)
npx vercel dev --yes --listen 3000

# Open http://localhost:3000
```

## Vercel Deploy

1. Go to vercel.com → New Project → Import Git Repository
2. Set Root Directory to `projects/week-03-datapunk/demo-03-federal-money`
3. No build command needed
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy

## Test Cases

- `Lockheed Martin` — large defense contracts
- `Amazon` — cloud/AWS government contracts
- `Deloitte` — consulting contracts
- `Northrop Grumman` — defense/aerospace

## Data Source

Contract data from [USASpending.gov](https://www.usaspending.gov/) (Federal Procurement Data System). Award amounts reflect obligated amounts as reported; actual spending may differ.

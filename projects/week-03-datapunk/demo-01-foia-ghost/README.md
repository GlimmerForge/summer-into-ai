# FOIA Ghost

> ZIP-code intelligence dossier. Enter a ZIP, watch AI synthesize EPA violations + Census poverty data + FEMA disaster history into a classified neighborhood intelligence report — with extended thinking streamed live.

## How the AI Powers It

1. `/api/fetch` hits three federal APIs in parallel (Census ACS 5-year, EPA ECHO, FEMA Disaster Declarations) and returns structured data for the ZIP.
2. `/api/analyze` streams a `claude-sonnet-4-6` response using **extended thinking** (`betas: ['interleaved-thinking-2025-05-14']`). The model's internal reasoning appears in real time as a collapsible "REASONING STREAM" before the dossier itself renders.
3. Claude cross-references all three datasets to surface hidden patterns — economic precarity + environmental exposure + disaster frequency — that no single dataset reveals alone.

## Local Dev

```bash
cd projects/week-03-datapunk/demo-01-foia-ghost
cp .env.local .env.local   # add your real key
npx vercel dev --yes --listen 3001
```

Open `http://localhost:3001`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key with access to `claude-sonnet-4-6` and extended thinking beta |

## Vercel Deploy

1. New project → Import Git Repository (this repo)
2. Set **Root Directory** to `projects/week-03-datapunk/demo-01-foia-ghost`
3. No build command needed
4. Add env var: `ANTHROPIC_API_KEY`
5. Deploy

The `vercel.json` sets `maxDuration: 60` because extended thinking + 3 parallel API calls can take 30–45 seconds.

## Data Sources

- **U.S. Census Bureau** — ACS 5-Year Estimates (2022), income, poverty, internet access, housing age
- **EPA ECHO** — Active regulated facilities and violation flags by ZIP
- **FEMA Open Data** — Disaster declaration summaries by state, last 5 years
- **Zippopotam.us** — ZIP-to-city/state resolution (no key required)

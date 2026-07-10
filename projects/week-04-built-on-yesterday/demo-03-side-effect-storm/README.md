# Side Effect Storm

Compare up to 3 drugs across 10M+ FDA adverse event reports — spider chart overlays, severity profiles, trend sparklines, and Claude extended thinking for interaction analysis.

**Built on:** Side Effect Oracle (Week 3, demo-02-side-effect-oracle)

## How AI Powers It

Two API endpoints:

| Endpoint | Role |
|----------|------|
| `POST /api/drug` | Fetches FDA FAERS data for 1–3 drugs in parallel — top reactions, seriousness breakdown, 24-month trend, label warnings. No AI involved; pure FDA API. |
| `POST /api/analyze` (SSE) | Sends all drug data to Claude with **extended thinking** enabled. Streams both the internal reasoning trace and the final clinical analysis. Claude identifies interaction risks, shared adverse event patterns, vulnerable populations, and top recommendations. Then a second forced **tool call** distills the analysis into a structured storm-severity rating that drives the on-screen gauge. |

Extended thinking (`budget_tokens: 8000`) gives Claude space to reason through cross-drug interaction mechanisms before presenting its conclusions. The reasoning trace is streamed live to the "REASONING TRACE" panel so you can watch it think.

**Storm gauge** — after the prose analysis completes, Claude rates the combination 1–10 via a `set_storm_gauge` tool call (`{ riskLevel, stormCategory, headline, keyInteraction }`). The UI renders it as an animated severity bar with a weather-style category name ("TROPICAL STORM", "CATEGORY 4 HURRICANE") — the AI's judgment directly drives interface state, not just text.

## What It Shows

- **Radar / Spider Chart** — D3 polygon overlay of top 10 adverse reactions per drug (hover dots for exact counts)
- **Severity Profile** — stacked horizontal bars: serious vs. non-serious adverse events by drug
- **Reporting Trend** — 24-month sparklines showing monthly FAERS report volume per drug
- **AI Analysis** — streamed Claude extended thinking + clinical analysis (requires 2+ drugs)

## Local Dev

```bash
# Install deps
npm install

# Set your Anthropic key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Start Vercel dev server
npx vercel dev --yes --listen 3000
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — only needed for `/api/analyze` (AI combination analysis). FDA data queries in `/api/drug` are keyless. |

## Vercel Deploy

1. Import this repo into Vercel
2. Set **Root Directory** to `projects/week-04-built-on-yesterday/demo-03-side-effect-storm`
3. No build command needed
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy

`maxDuration` is set to 60s in `vercel.json` to accommodate Claude extended thinking latency.

## FDA Data Notes

- Data source: [FDA Adverse Event Reporting System (FAERS)](https://open.fda.gov/apis/drug/event/)
- No API key required
- Drug names are uppercased before querying (FDA is case-sensitive)
- Some obscure drugs may return 404 (no FAERS records) — handled gracefully per-drug
- Rate limit (429) is caught and surfaced as a user-friendly message

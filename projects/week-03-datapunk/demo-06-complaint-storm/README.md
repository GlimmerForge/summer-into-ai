# Complaint Storm

**Every complaint Americans filed with the government about your bank — animated as a particle storm, then argued by AI as prosecutor and defense at the same time.**

Enter any bank, insurer, or fintech company name. Real consumer complaints from the federal Consumer Financial Protection Bureau (CFPB) materialize as a living particle physics simulation — each complaint is a glowing particle that flies in and clusters by issue type. Then watch Claude argue BOTH sides of the evidence simultaneously in a streaming split-screen courtroom debate.

---

## How AI Powers It

- **`/api/complaints`** — Queries the live CFPB Consumer Complaint Database (no API key required) for up to 500 complaints. Computes issue breakdown and resolution rate server-side. Returns structured data used to drive both the particle simulation and the AI duel.

- **`/api/duel` (SSE streaming)** — Sends complaint summaries, issue breakdowns, and narrative samples to Claude (`claude-sonnet-4-6`). Claude generates a structured courtroom debate with `[P]` prosecution, `[D]` defense, and `[VERDICT]` markers. The server parses these markers in real time and streams typed SSE events to the client, which routes each chunk to the correct column with a typewriter effect.

The debate is impossible without the real complaint data — the AI cites specific numbers, issue patterns, and resolution rates from the live CFPB feed. Remove the data, and the duel collapses.

---

## Local Development

### Prerequisites

- Node.js 18+
- Vercel CLI: `npm install -g vercel`
- An Anthropic API key

### Setup

```bash
cd projects/week-03-datapunk/demo-06-complaint-storm
npm install
cp .env.local .env.local   # edit to add your real key
npx vercel dev --yes --listen 3001
```

Open [http://localhost:3001](http://localhost:3001)

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key from console.anthropic.com |

---

## Data Source

**CFPB Consumer Complaint Database**
- URL: [consumerfinance.gov/data-research/consumer-complaints](https://www.consumerfinance.gov/data-research/consumer-complaints/)
- API: `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/`
- No API key required — federal public dataset
- Updated daily; contains 3M+ complaints since 2011

---

## Test Companies

Known companies with large complaint volumes in the CFPB database:

| Company Input | Approx Complaints |
|---|---|
| Wells Fargo | 100,000+ |
| JPMorgan Chase | 80,000+ |
| Bank of America | 90,000+ |
| Coinbase | 15,000+ |
| Equifax | 50,000+ |
| Citibank | 60,000+ |
| Capital One | 60,000+ |

If a name doesn't return results, try the exact CFPB name:
- `WELLS FARGO BANK, N.A.`
- `JPMORGAN CHASE & CO.`
- `BANK OF AMERICA, NATIONAL ASSOCIATION`
- `COINBASE, INC.`
- `EQUIFAX, INC.`

---

## Vercel Deploy

1. Import this repository into Vercel
2. Set **Root Directory** to `projects/week-03-datapunk/demo-06-complaint-storm`
3. No build command needed
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy

Or deploy from the CLI:
```bash
VERCEL_PROJECT_ID=prj_xxx VERCEL_ORG_ID=team_xxx npx vercel deploy --prod --yes
```

---

## Week 3 — Data.Punk

> "It's punk because you know the government never built apps for this data."

This demo transforms the CFPB Consumer Complaint Database — a dry federal spreadsheet of 3 million grievances — into a kinetic visual argument. The government collected it. This makes it useful, dramatic, and confrontational.

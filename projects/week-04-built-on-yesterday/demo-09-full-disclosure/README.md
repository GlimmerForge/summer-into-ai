# Full Disclosure

One company name in. Four federal datasets out — cross-referenced by Claude into a single joint-inquiry verdict with a 0-100 Disclosure Index.

## Built on (all Week 4)

This is the finale entry for the "Built on Yesterday" theme, and it takes the theme literally: its entire data layer is reused from **four sibling demos built earlier this same week**:

| Dataset | Reused from | What was reused |
|---|---|---|
| FEC political contributions | [demo-01-money-trail](../demo-01-money-trail/) | `schedule_a` employee-contribution queries + amount aggregation from `api/fec.js` |
| CFPB consumer complaints | [demo-07-class-action](../demo-07-class-action/) | `_suggest_company` fuzzy name resolution + `has_narrative=true` sampling from `api/discover.js` |
| EPA Toxic Release Inventory | [demo-05-sworn-testimony](../demo-05-sworn-testimony/) | TRI facility search + `tri_chem_info` carcinogen/PFAS counting from `api/dossier.js` |
| FDA adverse events | [demo-03-side-effect-storm](../demo-03-side-effect-storm/) | FAERS reaction counts + seriousness breakdown from `api/drug.js` |

Each demo earlier this week could see one slice of a company's federal record. Full Disclosure fetches all four slices in parallel and asks Claude for the connections none of them could see alone.

## How the AI powers it

1. **`api/gather.js`** — no AI, all reuse: fetches the four federal datasets in parallel (one serverless call per dataset from the frontend, so the four "BUREAU REPORTS" panels fill in live). Every dataset has a ~20s timeout and degrades gracefully to "NO RECORDS / UNAVAILABLE" instead of failing the investigation.
2. **`api/synthesize.js`** — Claude (`claude-sonnet-4-6`) receives all four raw datasets and streams a **cross-reference analysis over SSE with extended thinking visible**: thinking deltas fill a collapsible "analyst working notes" panel while the final prose streams into the main report. The prompt explicitly forbids four separate summaries — it demands cross-dataset findings (political money vs. complaint volume, donors vs. consumer narratives, environmental footprint vs. consumer harm).
3. **`api/verdict.js`** — a second Claude call with a **forced tool call** (`submit_verdict`, no thinking — the API rejects thinking + forced tool_choice) distills everything into structured output: a 0-100 Disclosure Index, a headline, and 3-5 key findings that each name which datasets they connect (rendered as FEC×CFPB-style badges with severity pips).

## Try it

Enter a large company: **Wells Fargo** (finance — heavy CFPB), **Pfizer** or **Johnson & Johnson** (pharma — FDA + EPA), **Exxon** (energy — EPA), **Boeing** (aerospace — FEC + EPA). Small companies will legitimately come back "RECORD SILENT" from most agencies — absence is itself a finding.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers synthesis + verdict |
| `FEC_API_KEY` | Recommended | Free at https://api.data.gov/signup — without it the FEC panel uses `DEMO_KEY` (~20 req/hr shared, rate-limits quickly) |

CFPB, EPA, and FDA endpoints need no keys.

## Local dev

```bash
cd projects/week-04-built-on-yesterday/demo-09-full-disclosure
npm install
# put real keys in .env.local
npx vercel dev --listen 3001
# open http://localhost:3001
```

## Deploy to Vercel

1. New Vercel project → import this repo
2. Root Directory: `projects/week-04-built-on-yesterday/demo-09-full-disclosure`
3. No build command needed (static `index.html` + `api/` serverless functions)
4. Add env vars `ANTHROPIC_API_KEY` and `FEC_API_KEY`
5. Deploy

## Smoke test

```bash
node tools/test-demo.mjs --url <deployed-url> --demo week-04-demo-09-full-disclosure
```

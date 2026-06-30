# Side Effect Oracle

Enter any drug name and discover what FDA's Adverse Event Reporting System actually shows — how often each side effect is reported, and how that compares to the language on the official label.

## How AI Powers It

1. **`/api/oracle`** — Queries two FDA APIs in parallel (no AI involved):
   - **FAERS adverse event counts**: Top 25 reactions sorted by report frequency, plus the total report count for context
   - **FDA drug label**: Official prescribing information including adverse reactions, warnings, and warnings_and_cautions sections

2. **`/api/analyze`** — Sends both datasets to Claude `claude-sonnet-4-6` with **extended thinking** (`budget_tokens: 6000`) and **streams** the analysis via SSE. Claude compares post-market reporting reality to official label language, surfacing reactions that are frequent in FAERS but minimized or absent from the label. Extended thinking lets Claude reason about statistical significance, reporting bias, and the meaning of FDA frequency designations before writing the dossier.

**AI depth**: Remove the AI call and you have a data display tool. With it, you get a clinical analyst who understands FDA reporting epidemiology, voluntary-reporting undercount bias, and the difference between "rare" as a legal designation vs. what appears in 10,000 FAERS records.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — powers Claude analysis with extended thinking |

No other API keys needed. FDA APIs are public (no key required).

## Local Development

```bash
# Install dependencies
npm install

# Add your Anthropic key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Start Vercel dev server (handles /api/ routing)
npx vercel dev --yes --listen 3000
```

Then open http://localhost:3000 and try: `ibuprofen`, `metformin`, `lisinopril`, `sertraline`

## Vercel Deploy

1. Create a new Vercel project importing this repo
2. Set **Root Directory** to `projects/week-03-datapunk/demo-02-side-effect-oracle`
3. No build command or output directory override needed
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy

## Data Sources

- **FDA FAERS** (Adverse Event Reporting System): `api.fda.gov/drug/event.json` — voluntary adverse event reports from healthcare providers, manufacturers, and patients
- **FDA Drug Label Database**: `api.fda.gov/drug/label.json` — official prescribing information
- Both are public FDA APIs, no API key required

## Notes on FAERS Data

FAERS is a passive, voluntary reporting system. The report counts shown **underestimate real-world incidence by an estimated 10-100x**. A drug with 5,000 FAERS reports for a given reaction may represent 50,000–500,000 actual patient experiences. The FDA defines "rare" as occurring in fewer than 1 in 10,000 patients — Claude's analysis applies this context when comparing label language to report volumes.

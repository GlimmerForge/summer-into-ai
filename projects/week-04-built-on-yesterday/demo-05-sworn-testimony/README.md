# Sworn Testimony

Cross-examine a classified federal dossier on the witness stand — and catch it lying under oath.

**Built on: [FOIA Ghost (Week 3)](../../week-03-datapunk/demo-01-foia-ghost/)** — FOIA Ghost generated a passive "classified dossier" for any ZIP code from real federal data. Sworn Testimony reuses FOIA Ghost's entire data-fetching pipeline (Census ACS income/poverty, EPA Toxic Release Inventory facilities + carcinogen/PFAS chemicals, FEMA disaster declarations) and puts that dossier ON THE WITNESS STAND: it becomes an evasive, bureaucratic witness you interrogate — one that fabricates a detail in roughly one answer out of three. A second, independent AI (the Verifier) audits every answer against the raw fetched data and renders a structured verdict. Expose a fabrication, score a point.

## How the AI powers it

Three endpoints, three distinct AI roles:

1. **`api/dossier.js` — the Custodian of Records.** Fetches the same real federal data FOIA Ghost used (Census + EPA TRI + FEMA, via `Promise.allSettled`), then Claude (`claude-sonnet-4-6`) synthesizes a terse classified case-file summary that is read into the record. The raw JSON is returned to the client and becomes the ground truth for everything that follows.

2. **`api/witness.js` — the Dossier itself (SSE streaming).** Claude roleplays "The Dossier", a dry, evasive, self-important document given a voice, answering cross-examination questions and citing specific figures from the record. On ~1 in 3 answers, the server secretly injects a directive to fabricate exactly one checkable detail. Answers stream token-by-token over Server-Sent Events (`data: {json}\n\n`, terminated by a `{type:'done'}` event; the frontend has a stall guard for streams that close early).

3. **`api/verify.js` — the Verifier (forced tool call).** A second, independent Claude call receives the raw data record, the question, and the sworn answer, and must respond via a forced `tool_choice` call to `render_verdict`, returning structured JSON: `{ verdict: 'SUPPORTED' | 'UNVERIFIED' | 'CONTRADICTED', evidence, explanation }`. The UI renders a green/amber/red badge under each answer. `CONTRADICTED` verdicts increment the "Fabrications exposed" score. (Forced tool calls are never combined with extended thinking — the API rejects that combination.)

The adversarial loop is the point: one AI is instructed to lie, a second AI audits it against ground-truth data, and the player's skill is asking questions precise enough to force a checkable claim.

## Local development

```bash
cd projects/week-04-built-on-yesterday/demo-05-sworn-testimony
npm install
npx vercel dev
```

Then open the printed localhost URL, enter a ZIP (try `90210`, `77015`, or `10001`), and start examining.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | All three Claude calls (`claude-sonnet-4-6`) |
| `CENSUS_API_KEY` | No | Raises Census API rate limits (works without it) |

## Deploy to Vercel

1. New Vercel project → Import the repo
2. Set **Root Directory** to `projects/week-04-built-on-yesterday/demo-05-sworn-testimony`
3. No build command needed (static `index.html` + `api/*` serverless functions)
4. Add env var `ANTHROPIC_API_KEY`
5. Deploy

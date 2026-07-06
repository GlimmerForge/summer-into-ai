# Money Trail

Multi-hop PAC network tracer — follow dark money from donor through shell committees to candidate, then interrogate the chain with AI extended thinking.

Built on: [Dark Money Map (Week 3)](../../../week-03-datapunk/demo-05-dark-money-map/)

---

## How AI Powers It

**PAC chain traversal** — `api/fec.js` fetches FEC schedule_a data three layers deep: individual donors feed PAC committees, PAC committees feed candidates. The graph shows all three layers simultaneously.

**Claude extended thinking** — `api/oracle.js` uses `claude-sonnet-4-6` with `thinking: { type: 'enabled', budget_tokens: 10000 }`. The full reasoning chain streams in real time to a collapsible "EXTENDED REASONING" panel before the final analysis appears. Extended thinking lets the Oracle trace multi-hop money flows that require comparing dozens of node relationships simultaneously.

**Tool use + node highlighting** — The Oracle calls `highlight_nodes` with specific node IDs to illuminate relevant donors and PAC chains on the live D3 graph while streaming its analysis.

**Compare mode** — Load two candidates side-by-side. Shared donors glow with a white ring, making bipartisan donation patterns immediately visible.

---

## Local Dev

```bash
cd projects/week-04-built-on-yesterday/demo-01-money-trail
cp .env.local .env.local   # already exists — fill in real keys
npx vercel dev --yes --listen 3000
# open http://localhost:3000
```

---

## Env Vars

| Variable | Required | Notes |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | Yes | Extended thinking oracle |
| `FEC_API_KEY` | No | Falls back to DEMO_KEY (20 req/hr) |

---

## Vercel Deploy

1. New project → Import this repo
2. Root directory: `projects/week-04-built-on-yesterday/demo-01-money-trail`
3. No build command needed
4. Add env vars: `ANTHROPIC_API_KEY`, `FEC_API_KEY` (optional)
5. Deploy

`vercel.json` sets `maxDuration: 60` on API functions — PAC chain traversal can take 10–25s depending on FEC API latency.

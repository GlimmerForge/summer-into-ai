# Situation Room

**You are the Flight Director of a global crisis desk. Live planetary data feeds the crisis in — the AI briefs you, you allocate scarce response units, and the AI judges every call.**

> **Built on: [Earth Pulse (Week 3)](../../week-03-datapunk/demo-04-earth-pulse/)** — Earth Pulse passively narrated live planetary vitals. Situation Room reuses and extends its live-data pipeline (USGS seismic + Open-Meteo city stations, plus new NOAA space weather), then puts you in command: instead of listening to the planet, you have to run the response.

## How the AI powers it

Two forced structured tool calls per round, both grounded in **real, live public data** (no API keys needed for any feed):

1. **`/api/briefing`** — fetches, in parallel with 20s timeouts and graceful per-feed fallback:
   - USGS earthquake feed (`all_day.geojson`) — every quake on Earth in the last 24h
   - NOAA SWPC planetary K-index (1-minute cadence) — live geomagnetic storm level
   - Open-Meteo current weather for 5 major cities (code adapted from Earth Pulse)

   Claude (`claude-sonnet-4-6`) receives the snapshot and files a **crisis briefing** via a forced tool call: `{ headline, situation, threats: [{ id, name, severity 1-10, region, lat, lon }], recommendation }`. Real quakes and space weather anchor the scenario — the AI escalates plausibly from real signals, never against them. Threats are plotted on the war-room map at their real coordinates, alongside every live USGS quake.

2. **`/api/execute`** — after you allocate response units and hit EXECUTE, a second forced tool call adjudicates: `{ outcomes (CONTAINED → CATASTROPHIC per threat), casualtiesAverted, score 0-100, assessment, nextComplication }`. The judge grades strictly against the briefed severities and your reserve strategy — the complication carries into the next round's briefing.

## Game structure

- One shift = **3 rounds**, each seeded by a fresh live-data pull plus the carry-over complication.
- Fixed pool of **10 response units per shift** — it does not replenish. Spend big early or hold reserve; the AI judge weighs both.
- Final score out of 300 earns a rank: Distinguished Director, Senior Flight Director, Watch Officer, Desk Analyst, or Relieved of Duty.

## Local dev

```bash
cd projects/week-04-built-on-yesterday/demo-06-situation-room
npm install
# put a real key in .env.local
npx vercel dev --yes --listen 3001
# open http://localhost:3001
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude briefing + judgment calls |

The USGS, NOAA SWPC, and Open-Meteo feeds are public and keyless.

## Deploy to Vercel

1. New project → Import this Git repository
2. Set **Root Directory** to `projects/week-04-built-on-yesterday/demo-06-situation-room`
3. No build command, no output directory override
4. Add `ANTHROPIC_API_KEY` env var
5. Deploy

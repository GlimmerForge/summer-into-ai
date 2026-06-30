# EARTH PULSE — Planetary Vital Signs

A real-time planetary monitoring station that pulls live data from 3 public APIs every 60 seconds, synthesizes it into a cinematic briefing via Claude, and narrates the briefing aloud via ElevenLabs.

## How AI powers it

- **Claude (`claude-sonnet-4-6`)** — Streaming SSE analysis endpoint. Receives live seismic, market, and atmospheric data and generates a 4–5 sentence documentary-style planetary briefing in real time. Text streams onto the screen character by character.
- **ElevenLabs TTS** — After the briefing streams in, the text is sent to ElevenLabs (Rachel voice) and the audio plays automatically, making the experience feel like a living broadcast.

## Data sources (all free, no API keys)

| Source | What it provides |
|--------|-----------------|
| USGS Earthquake Feed | Past-hour earthquake count, max magnitude, M3.0+ count, recent location |
| CoinGecko | BTC and ETH price + 24h change |
| Open-Meteo | Current temperature at NYC, London, Tokyo, Sydney, Dubai |

## Canvas animation

Full-viewport HTML5 Canvas with:
- Starfield (200+ twinkling stars)
- Central pulsing core sphere (white → blue gradient, breathing with sin wave)
- Three orbital rings with traveling particle clusters — speeds respond to live data intensity
- Ripple waves that burst from the core on each data refresh
- Subtle background grid

## Local dev

```bash
cd projects/week-03-datapunk/demo-04-earth-pulse
cp .env.local.example .env.local  # or edit .env.local directly
# Fill in your keys, then:
npx vercel dev --listen 3001
# Open http://localhost:3001
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Powers the Claude streaming analysis |
| `ELEVENLABS_API_KEY` | Yes | Powers TTS narration (Rachel voice) |

## Vercel deploy

1. New project → Import this Git repo
2. Set **Root Directory** to `projects/week-03-datapunk/demo-04-earth-pulse`
3. No build command needed
4. Add `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` in Environment Variables
5. Deploy

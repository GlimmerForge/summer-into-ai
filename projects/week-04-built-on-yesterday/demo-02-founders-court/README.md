# The Founders' Court

Five founding fathers debate modern constitutional controversies — with extended thinking visible and ElevenLabs voice for each founder.

An explicit upgrade of [The Convention (Week 2)](../../week-02-red-white-boom/demo-08-the-convention/).

## How AI Powers It

- **Claude extended thinking** — each founder's internal reasoning chain streams live in a collapsible "Reasoning" panel before their argument appears. You see _how_ Madison thinks about AI rights.
- **Parallel Claude instances** — all 5 founders reason simultaneously. Five independent Claude calls, each grounded in real historical quotes from that founder's writings.
- **Historical evidence injection** — each system prompt includes 3 actual quotes from that founder, anchoring their 18th-century reasoning.
- **Structured vote output** — each founder ends with `[VOTE:FOR]` or `[VOTE:AGAINST]`, parsed client-side to show a tally and final verdict.
- **ElevenLabs TTS** — each founder has a distinct voice ID. After arguments stream, click "Speak" to hear the argument read aloud.

## Topics

Six curated modern constitutional controversies:
- AI Rights & Personhood
- Social Media & Speech
- Digital Surveillance
- Universal Healthcare
- Weapons Technology
- Executive Power

## Local Dev

```bash
cd projects/week-04-built-on-yesterday/demo-02-founders-court
cp .env.local .env.local   # fill in your keys
npx vercel dev --yes --listen 3001
```

Open http://localhost:3001

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers Claude extended thinking for all 5 founders |
| `ELEVENLABS_API_KEY` | No | Powers per-founder voice synthesis. If absent, "Voice unavailable" is shown gracefully. |

## Vercel Deploy

1. Import this repo as a new Vercel project
2. Set Root Directory to `projects/week-04-built-on-yesterday/demo-02-founders-court`
3. No build command needed
4. Add `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` environment variables
5. Deploy

The `vercel.json` sets `maxDuration: 60` for API functions — extended thinking can take 15–30 seconds per founder.

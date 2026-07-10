# The Founders' Court

Five founding fathers debate modern constitutional controversies in two rounds — opening arguments, then targeted rebuttals — with Chief Justice Marshall judging who argued best.

An explicit upgrade of [The Convention (Week 2)](../../week-02-red-white-boom/demo-08-the-convention/).

## How AI Powers It

Three distinct AI roles, layered:

1. **Advocates (generate)** — all 5 founders reason simultaneously with Claude extended thinking. Each reasoning chain streams live in a collapsible "Reasoning" panel; each system prompt includes 3 real quotes from that founder's writings.
2. **Adversaries (rebut)** — after round 1, each founder receives the other four arguments, uses extended thinking to pick the strongest opposing claim, and writes a rebuttal naming its author directly.
3. **Judge (evaluate)** — `api/verdict.js`: Chief Justice John Marshall reads the full two-round transcript and delivers a structured opinion via forced tool call — best advocate, why they won, and a judicial opinion referencing specific claims. The winning founder's column is crowned gold.

Plus:
- **Structured vote output** — each founder ends with `[VOTE:FOR]` or `[VOTE:AGAINST]`, parsed client-side into the tally.
- **ElevenLabs TTS** — each founder has a distinct voice ID. Click "Speak" to hear the argument read aloud.

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

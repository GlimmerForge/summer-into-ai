# The Broadcast — AI Radio Drama

**Week 2 · Red White & Boom**

Claude writes a complete period radio drama. ElevenLabs performs it with distinct voices. You listen.

## How AI powers it

- `api/write.js` — Claude (`claude-sonnet-4-6`) writes a 13–16 line dramatic script via tool use, structured as `{ character, voiceId, text, pauseAfter }`. Historical detail, period language, real tension — not exposition.
- `api/voice.js` — ElevenLabs (`eleven_turbo_v2_5`) voices each line in sequence using character-specific voice IDs.
- Canvas Web Audio API analyser node renders a real frequency waveform that responds to the voices as they play.

Three scenes: The Signing (July 4, 1776), The Ride (April 18, 1775), The Winter (Valley Forge, December 1777).

## Local dev

```bash
cd projects/week-02-red-white-boom/demo-09-the-broadcast
npm install
node server.js
# → http://localhost:3009
```

## Environment variables

| Variable | Required |
|---|---|
| `ANTHROPIC_API_KEY` | Yes |
| `ELEVENLABS_API_KEY` | Yes |

Add both to `.env.local` for local dev.

## Vercel deploy

```powershell
cd projects/week-02-red-white-boom/demo-09-the-broadcast
& "C:\Users\jake2\AppData\Roaming\npm\vercel.cmd" --prod
```

Add `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` in Vercel dashboard → Settings → Environment Variables, then redeploy.

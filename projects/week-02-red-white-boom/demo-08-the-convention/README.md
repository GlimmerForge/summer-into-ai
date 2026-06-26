# The Convention

> Five founding fathers. Five simultaneous Claude instances. A debate that runs itself.

**Live demo:** [https://convention-1776.vercel.app](https://convention-1776.vercel.app)  
**Part of:** [Summer into AI 2026](https://advisoryhour.substack.com) · Week 2 · Theme: Red, White & Boom

## What it is

Put any question before five founding delegates — Jefferson, Hamilton, Madison, Mason, and Franklin — each running as a separate Claude instance with historically grounded system prompts. All five open simultaneously in parallel streams. Then three exchange rounds run: every agent simultaneously decides whether to respond and to whom (5 parallel tool-use calls), the highest-urgency unheard voice gets the floor, and their response is read aloud in their ElevenLabs voice. The conversation emerges from agent decisions, not a script.

## How to run locally

1. Clone the repo and `cd` into this folder
2. Copy `.env.local.example` to `.env.local` and fill in your API keys
3. `npm install`
4. `node server.js`
5. Open http://localhost:3008

## Environment variables

| Variable | Required | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | https://console.anthropic.com |
| `ELEVENLABS_API_KEY` | Optional | https://elevenlabs.io → Profile → API Keys |

## Deploy to Vercel

1. Import repo into Vercel, set **Root Directory** to `projects/week-02-red-white-boom/demo-08-the-convention`
2. Add environment variables in Project Settings → Environment Variables
3. Deploy — no build step required

## How to play

- Pick a question (or type your own) and hit **Convene**
- Watch all five founders stream their opening statements simultaneously
- Voice plays each statement in order
- Three exchange rounds follow — agents vote on who should respond, highest-urgency unheard voice speaks
- Read the structured synthesis at the end

## How the AI works

- **`POST /api/speak`** — streams one founder's statement via SSE; each agent has a distinct historically-grounded system prompt
- **`POST /api/react`** — non-streaming tool-use call; each of the 5 agents returns `{ wantsToRespond, targetFounder, targetArgument, urgency }`; all 5 fire in parallel
- **`POST /api/synthesize`** — Claude tool calling (`analyze_debate`) produces structured output: points of agreement, fault lines, sharpest exchange, convention verdict
- **`POST /api/voice`** — ElevenLabs proxy; each founder has a distinct voice chosen for character fit

**Total API calls per debate:** 5 opening + up to 15 reaction + 3 speak + 1 synthesis = up to 24 Claude invocations

## Tech

- Claude (`claude-sonnet-4-6`) via Anthropic SDK — parallel streaming, tool use, structured output
- ElevenLabs (`eleven_turbo_v2_5`) — per-founder voice assignments
- Vanilla JS + HTML — no framework, no build step

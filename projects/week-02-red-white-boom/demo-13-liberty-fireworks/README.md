# Liberty Fireworks

> Walk a colonial town, buy shells from period shops, wire your own mortars — then launch while Claude's Town Council judges your show live.

**Live demo:** [https://liberty-fireworks.vercel.app](https://liberty-fireworks.vercel.app/)  
**Part of:** [Summer into AI 2026](https://advisoryhour.substack.com) · Week 2 · Theme: Red, White & Boom

## What it is

An Oregon Trail-style colonial fireworks game where every decision matters. The Town Council issues a brief (required colors, minimum shells, finale type) and you have 120 Liberty Dollars to shop three period stores. Load your 16 mortars, wire fuses, apply dyes — then watch Claude judge your show shell by shell with a live streaming verdict.

## How to run locally

1. Clone the repo and `cd` into this folder
2. Copy `.env.local.example` to `.env.local` and fill in your API keys
3. `npm install`
4. `node server.js`
5. Open http://localhost:3013

## Environment variables

| Variable | Required | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | https://console.anthropic.com |
| `ELEVENLABS_API_KEY` | Yes | https://elevenlabs.io → Profile → API Keys |

## Deploy to Vercel

1. Import repo into Vercel, set **Root Directory** to `projects/week-02-red-white-boom/demo-13-liberty-fireworks`
2. Add environment variables in Project Settings → Environment Variables
3. Deploy — no build step required

## How to play

- Read the Town Council brief — note required colors, shell count, and finale type
- Visit the Powder House, Ironmonger, and General Store to buy shells, dyes, and fuses
- On the launch screen, load shells into mortar slots and apply dyes to recolor
- Hit FIRE and watch your show while Claude streams the crowd reaction live
- Receive your verdict: SPLENDID / ADEQUATE / DISAPPOINTING / A DISGRACE

## How the AI works

- **Brief generation** (`/api/brief`) — Claude tool-calls `set_show_brief` to produce a structured show brief: occasion, required colors, minimum shells, finale type, crowd size, council note — all in colonial voice
- **Shopkeeper chat** (`/api/shopkeeper`) — streams in-character advice from Old Jacob, Mistress Hawthorne, or Young Thomas, tailored to your current brief and inventory
- **Show evaluation** (`/api/evaluate`) — Claude receives the full shell-by-shell breakdown of your show and streams a vivid, specific council verdict referencing actual shells you fired
- **Crowd sound** (`/api/crowd`) — ElevenLabs sound generation produces a real crowd cheer or boo at the results screen based on your verdict

## Tech

- Claude (`claude-sonnet-4-6`) via Anthropic SDK — brief generation, shopkeeper dialogue, show evaluation
- ElevenLabs sound generation API — crowd reaction audio
- Vanilla JS + HTML Canvas — no framework, no build step

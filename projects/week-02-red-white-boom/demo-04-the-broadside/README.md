# The Pennsylvania Broadside

**Week 2 · Theme: Red, White & Boom · Summer Into AI 2026**

July 4th, 1776 — an AI-powered printing experience: Claude composes period broadside content for the day the Declaration went to press.

> Week 4's [Stop the Presses](../../week-04-built-on-yesterday/demo-08-stop-the-presses/) builds on this demo — turning the print shop into a disinformation game.

## Stack

- `index.html` — vanilla JS letterpress UI
- `api/` — Vercel serverless functions calling `claude-sonnet-4-6`

## Local Dev

```bash
cd projects/week-02-red-white-boom/demo-04-the-broadside
npx vercel dev --yes --listen 3001
```

Requires `ANTHROPIC_API_KEY` in `.env.local`.

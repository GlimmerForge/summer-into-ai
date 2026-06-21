# Found a Republic

**Week 1 · Theme: 8-Bit America · Summer Into AI 2026**

An 8-bit civics simulator set during the U.S. founding (1776–1791). A pixel advisory council hands you real founding-era dilemmas — free speech vs. order, roads vs. schools, a strong executive vs. committees. You choose; Claude reasons out the consequences live via a period newspaper headline, a short chronicle with the civic lesson, and shifts to your four meters: **Liberty · Prosperity · Unity · Order**. After seven decisions, AI writes your republic's legacy — a different verdict every playthrough.

## How AI Powers It

Every turn makes one live call to Claude that returns:
- A newspaper **headline** + **chronicle** teaching a real civic tradeoff
- **Effects** on the four meters (the model's reasoning drives game state)
- The **next dilemma**, adapted to where your republic is heading

The finale generates a textbook-style **legacy** + grade (*Founding Triumph → Cautionary Tale*) from the decisions you actually made. Falls back to built-in demo mode if the API is unreachable.

## Deploy to Vercel

1. Import `GlimmerForge/summer-into-ai` in Vercel
2. Set **Root Directory** to `projects/week-01-8bit-america/demo-01-found-a-republic`
3. Add environment variable: `ANTHROPIC_API_KEY = sk-ant-...`
4. Deploy

The AI badge shows **● AI ENGINE** (green) when live, **● DEMO MODE** (grey) without a key.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Self-contained deployable game |
| `support.js` | DC component runtime |
| `api/ai.js` | Vercel serverless function — proxies prompts to Claude |
| `assets/boxart.png` | 1200×675 share image |
| `assets/icon.png` | 600×600 icon |
| `package.json` | Declares ESM for Vercel |

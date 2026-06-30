# Dark Money Map

Search any candidate or donor, watch political money connections snap into a live network — then ask The Oracle what it reveals.

## How AI Powers It

- **D3 force-directed graph** renders live FEC campaign finance data as an animated network constellation
- **The Oracle** (Claude claude-sonnet-4-6) answers natural-language questions about the network using streaming SSE
- Claude calls the `highlight_nodes` tool to pulse specific nodes on the visualization as it narrates findings
- Multi-turn chat maintains conversation context so follow-up questions build on prior analysis

## Data Source

[Federal Election Commission Open Data API](https://api.open.fec.gov/v1/) — 2023–2024 election cycle contributions, committees, and candidate data. Public domain.

## Local Dev

### Prerequisites
- Node.js 18+
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### Setup

```bash
cd projects/week-03-datapunk/demo-05-dark-money-map
npm install
cp .env.local .env.local   # edit with your keys
npx vercel dev --listen 3001
```

Open http://localhost:3001

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude (The Oracle chat) |
| `FEC_API_KEY` | No | FEC API key. Falls back to `DEMO_KEY` (20 req/hour limit). Get one free at https://api.open.fec.gov/developers/ |

## Vercel Deploy

1. Import this repo into Vercel
2. Set **Root Directory** to `projects/week-03-datapunk/demo-05-dark-money-map`
3. Add environment variables: `ANTHROPIC_API_KEY`, `FEC_API_KEY` (optional)
4. Deploy — no build command needed

## Features

- **Candidate mode**: Search a politician → see their top donors fanned out as a network
- **Donor mode**: Search a company or person → see every committee they've donated to
- **Force simulation**: D3 physics-based layout with attractive/repulsive forces
- **Particle animation**: Gold particles flow along edges showing money movement direction
- **The Oracle**: Ask "Who gives the most?", "Any bipartisan donors?", "Top industries?" — Claude highlights nodes as it answers
- **Hover**: Dim non-adjacent nodes for focused exploration
- **Tooltips**: Occupation, employer, amount, date on hover

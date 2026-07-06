# Deep Cover

Five-mission Culper Ring spy arc — decode enemy dispatches, compose disinformation, manage agent networks, and face Washington's extended-thinking judgment.

Built on: [The Culper Ring (Week 2)](../../../week-02-red-white-boom/demo-15-the-culper-ring/)

## How AI Powers It

Two serverless API endpoints:

**`/api/mission`** — Claude generates each mission's content dynamically: authentic period-coded dispatches (mixing Culper number codes and substitution ciphers), disinformation directives, and moral dilemmas. Content is shaped by your previous decisions, so each playthrough adapts to how you've managed the network.

**`/api/judge`** — Claude streams Washington's assessment using **extended thinking** (`budget_tokens: 6000`). The visible "Washington deliberates..." section shows the model's actual reasoning chain before the formal verdict arrives. Outcomes (`[SUCCESS]`, `[PARTIAL]`, `[FAILURE]`) and network integrity changes (`[NETWORK: +N]`) are parsed from the stream in real time.

### Mission Arc
| # | Type | Theme |
|---|------|-------|
| 1 | Decode | Introduction to the Ring's cipher system |
| 2 | Decode | British troop movements, harder dispatch |
| 3 | Compose | Write disinformation about Washington's position |
| 4 | Decision | Agent 355 may be compromised — burn her or risk the network? |
| 5 | Decode | The endgame — success determines if the Ring survives |

## Local Development

```bash
cd projects/week-04-built-on-yesterday/demo-04-deep-cover
cp .env.local .env.local   # edit and add your real key
npx vercel dev --yes --listen 3001
# open http://localhost:3001
```

## Vercel Deployment

1. Create a new Vercel project, set **Root Directory** to `projects/week-04-built-on-yesterday/demo-04-deep-cover`
2. No build command needed
3. Add environment variables (see table below)
4. Deploy

## Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | Yes | Used by both `/api/mission` and `/api/judge` |

## Agent Network

The SVG map shows five historical Culper Ring agents across Long Island, Manhattan, and the Connecticut shore. Agent status (active / compromised / burned) updates live as the story progresses, with color-coded dots and animated connection lines.

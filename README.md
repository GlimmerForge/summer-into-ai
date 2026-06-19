# Summer Into AI — Mono Repo

Weekly AI build sprint projects. Each week lives in its own folder under `projects/`, and each week can have multiple demos.

## Structure

```
summer-into-ai/
├── COMPETITION_RULES.md
├── README.md
└── projects/
    └── week-01-8bit-america/
        ├── THEME.md                      # Week theme brief & checklist
        ├── demo-01-pixel-memory-map/     # Standalone deployable app
        ├── demo-02-civic-quiz/           # Standalone deployable app
        └── demo-03-choose-your-republic/ # Standalone deployable app
```

## Adding a New Week

```bash
mkdir projects/week-02-theme-name
# add THEME.md, then create demo subfolders as you build
```

## Adding a Demo to a Week

```bash
mkdir projects/week-01-8bit-america/demo-02-my-idea
# build your app inside that folder
```

## Deploying a Demo to Vercel

Each demo folder is an independent app. To deploy one:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repo
3. Set **Root Directory** to `projects/week-01-8bit-america/demo-01-pixel-memory-map`
4. Vercel auto-detects the framework and deploys

Or via CLI from the demo folder:
```bash
cd projects/week-01-8bit-america/demo-01-pixel-memory-map
vercel
```

You can deploy as many demos from the same repo as you want — each gets its own Vercel project with its own URL.

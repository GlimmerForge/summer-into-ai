# Vercel CLI Deployment

Deploy demos directly from the terminal — no GitHub Actions, no dashboard import flow.

## Setup

Vercel CLI is installed at `C:\Users\jake2\AppData\Roaming\npm\vercel.cmd`.

**PATH fix (run once per new terminal session if `vercel` isn't recognized):**
```powershell
$env:Path += ";C:\Users\jake2\AppData\Roaming\npm"
```

**To make it permanent (run once ever):**
```powershell
[System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\jake2\AppData\Roaming\npm", "User")
```
Then open a new terminal — `vercel --version` should work from anywhere.

---

## Deploying a new demo (first time)

```powershell
cd projects/week-02-red-white-boom/demo-XX-slug
& "C:\Users\jake2\AppData\Roaming\npm\vercel.cmd" --prod
```

Vercel will:
1. Ask you to confirm the project name — accept or rename it
2. Detect it's not a framework project — confirm defaults
3. Deploy and give you a URL

**After first deploy — add env vars in the Vercel dashboard:**
- Go to the project → Settings → Environment Variables
- Add `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` (if used)
- Then redeploy: `vercel --prod` again from the same folder (env vars only take effect on next deploy)

**Then update `vercel-projects.json`** with the project ID from the dashboard URL:
```json
"projects/week-02-red-white-boom/demo-XX-slug": {
  "projectId": "prj_XXXX",
  "orgId": "team_D79TvyBcfHAyncBLxxnY1foW"
}
```

---

## Redeploying an existing demo

```powershell
cd projects/week-02-red-white-boom/demo-XX-slug
& "C:\Users\jake2\AppData\Roaming\npm\vercel.cmd" --prod
```

That's it. Vercel remembers the project from `.vercel/project.json` in the folder.

> **Note:** `.vercel/` is gitignored — if you're on a fresh clone, run `vercel link` first to reconnect the folder to its Vercel project, then `vercel --prod`.

---

## Linking a fresh clone to an existing project

```powershell
cd projects/week-02-red-white-boom/demo-XX-slug
& "C:\Users\jake2\AppData\Roaming\npm\vercel.cmd" link
# Select: jake-straits-projects → pick the project by name
```

Then deploy normally with `vercel --prod`.

---

## Env vars

| Variable | All demos | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | console.anthropic.com |
| `ELEVENLABS_API_KEY` | If using voices | elevenlabs.io → Profile → API Keys |

Set them in **Vercel dashboard → Project → Settings → Environment Variables**.  
Always redeploy after adding or changing env vars.

---

## When to still use GitHub Actions

The `workflow_dispatch` in `.github/workflows/deploy.yml` is still useful if:
- You want to redeploy multiple demos at once (check all the boxes, run once)
- You want deploys tied to git pushes automatically

For single-demo deploys, the CLI is faster.

---

## Org ID (same for all projects)

`team_D79TvyBcfHAyncBLxxnY1foW`

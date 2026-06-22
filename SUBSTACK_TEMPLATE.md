# Substack Post Template

Each demo gets a `SUBSTACK_POST.md` in its folder using the markdown format below.
When creating the Substack draft via API, use the **HTML version** — the API does not render markdown.

---

## Structure (always follow this order)

1. Hero image (full Vercel URL)
2. Competitor reference woven into the opening paragraph — no separate heading
3. Bold demo name + one-paragraph description
4. 2 gameplay screenshots
5. `## How the AI works` — bullet list of live AI calls only
6. `## Where to play` — demo link + code link
7. Footer line (italic, one line)

---

## SUBSTACK_POST.md (markdown — for the repo file)

```markdown
# Summer into AI 2026: [Demo Name]

![Demo Name](assets/[hero-image].png)

**[Competitor Demo]** by [Author] ([@handle](competitor-substack-url)) [one sentence on what they built and what was smart about it]. [One sentence on how it made you go a different direction.]

**[Demo Name]** is [one sentence description]. [One more sentence on what you do / how it plays]. [One sentence on the tech if notable.]

![Screenshot caption](assets/[screenshot-1].png)
![Screenshot caption](assets/[screenshot-2].png)

## How the AI works

[One sentence framing the AI role.]

- **[Feature name]** — [what Claude does, what the player sees]
- **[Feature name]** — [what Claude does, what the player sees]

[One sentence on fallback behavior if API is unreachable.]

## Where to play

**Demo:** [[slug].vercel.app](https://[slug].vercel.app)
**Code:** [github.com/GlimmerForge/summer-into-ai](https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/[week-folder]/[demo-folder])

---

*Summer into AI 2026 · Theme [N]: [Theme Name] · Competitor reference: [Demo] by [@handle](competitor-substack-url)*
```

---

## Substack API body (HTML — paste into the create_draft_post call)

```html
<img src="https://[slug].vercel.app/assets/[hero-image].png" alt="[Demo Name]" />

<p><strong>[Competitor Demo]</strong> by [Author] (<a href="competitor-substack-url">@handle</a>) [one sentence on what they built]. [One sentence on how it made you go a different direction.]</p>

<p><strong>[Demo Name]</strong> is [one sentence description]. [One more sentence on gameplay]. [Tech note if notable.]</p>

<img src="https://[slug].vercel.app/assets/[screenshot-1].png" alt="[caption]" />
<img src="https://[slug].vercel.app/assets/[screenshot-2].png" alt="[caption]" />

<h2>How the AI works</h2>

<p>[One sentence framing the AI role.]</p>

<ul>
<li><strong>[Feature name]</strong> — [what Claude does, what the player sees]</li>
<li><strong>[Feature name]</strong> — [what Claude does, what the player sees]</li>
</ul>

<p>[One sentence on fallback behavior.]</p>

<h2>Where to play</h2>

<p><strong>Demo:</strong> <a href="https://[slug].vercel.app">[slug].vercel.app</a><br/><strong>Code:</strong> <a href="https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/[week-folder]/[demo-folder]">github.com/GlimmerForge/summer-into-ai</a></p>

<hr/>

<p><em>Summer into AI 2026 · Theme [N]: [Theme Name] · Competitor reference: [Demo] by <a href="competitor-substack-url">@handle</a></em></p>
```

---

## Checklist before publishing

- [ ] Competitor reference confirmed — fetch their post, read it, write something specific
- [ ] Hero image is the strongest screenshot (sky full of fireworks, not a UI screenshot)
- [ ] Vercel project renamed so the URL is `[demo-name].vercel.app` (not `summer-into-ai.vercel.app`)
- [ ] Both image URLs resolve in a browser before creating the draft
- [ ] Delete older draft versions from Substack before publishing
- [ ] SUBSTACK_POST.md committed and pushed to GitHub

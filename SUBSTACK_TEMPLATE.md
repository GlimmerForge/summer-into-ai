# Substack Post Template

Reference post: https://jakestrait5.substack.com/p/summer-into-ai-2026-hall-of-the-republic

## Structure (always follow this order)

1. Hero image — full Vercel URL
2. Opening paragraph — START with the competitor (bold name, inline @handle link), what was smart about it, then pivot to your different direction. No separate "What I was reacting to" heading.
3. Bold demo name + description paragraph
4. 2 gameplay screenshots — full Vercel URLs
5. `## How the AI works` — one intro sentence, bullet list of AI calls, closing paragraph on fallback
6. `## How to play` — bullet list of controls (or a demo-specific section if no controls)
7. `## Where to play` — demo link + code link
8. `---` + footer italic line

---

## SUBSTACK_POST.md (markdown — save in each demo folder)

```markdown
# Summer into AI 2026: [Demo Name]

![Demo Name](assets/[hero-image].png)

**[Competitor Demo]** by [Author] ([@handle](competitor-substack-url)) [one sentence on what they built and what was smart]. [One sentence on how it made you go a different direction — end with a question or pivot].

**[Demo Name]** is [one-sentence description]. [One more sentence on what you do]. [One sentence on tech if notable — e.g. runs in one HTML file].

![Screenshot caption](assets/[screenshot-1].png)

![Screenshot caption](assets/[screenshot-2].png)

## How the AI works

[One sentence framing the AI role]:

- **[Feature]** — [what Claude does and what the player sees]
- **[Feature]** — [what Claude does and what the player sees]

[One sentence on graceful fallback if API is unreachable.]

## How to play

- [control or action]
- [control or action]
- [control or action]

## Where to play

**Demo:** [[slug].vercel.app](https://[slug].vercel.app)
**Code:** [github.com/GlimmerForge/summer-into-ai](https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/[week-folder]/[demo-folder])

---

*Summer into AI 2026 · Theme [N]: [Theme Name] · Competitor reference: [Demo] by [@handle](competitor-substack-url)*
```

---

## Substack API call (use markdown with full Vercel URLs for images)

Use the `mcp__substack-api__create_draft_post` tool. In the body, use markdown — NOT HTML. Images use full Vercel URLs:

```
![Demo Name](https://[slug].vercel.app/assets/[hero-image].png)

**[Competitor Demo]** by [Author] ([@handle](url)) [opening paragraph]...

**[Demo Name]** is [description paragraph]...

![caption](https://[slug].vercel.app/assets/[screenshot-1].png)

![caption](https://[slug].vercel.app/assets/[screenshot-2].png)

## How the AI works

[intro sentence]:

- **[Feature]** — [description]
- **[Feature]** — [description]

[fallback sentence]

## How to play

- [item]
- [item]

## Where to play

**Demo:** [[slug].vercel.app](https://[slug].vercel.app)
**Code:** [github.com/GlimmerForge/summer-into-ai](https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/[week]/[demo])

---

*Summer into AI 2026 · Theme [N]: [Theme Name] · Competitor reference: [Demo] by [@handle](url)*
```

---

## Checklist before publishing

- [ ] Fetch the competitor's post — read it, write something specific about what was smart
- [ ] Hero image is the strongest screenshot (action/sky, not UI)
- [ ] Vercel project renamed so URL is `[demo-name].vercel.app` (not `summer-into-ai.vercel.app`)
- [ ] Both screenshot URLs resolve in browser before creating draft
- [ ] SUBSTACK_POST.md committed and pushed to GitHub
- [ ] Delete older draft versions from Substack before publishing

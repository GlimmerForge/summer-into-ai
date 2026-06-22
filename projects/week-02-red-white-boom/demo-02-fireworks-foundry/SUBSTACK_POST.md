# Summer into AI 2026: Fireworks Foundry

![Fireworks Foundry](assets/ff-1.png)

**Dependency Day** by Myles ([@merlinforge](https://merlinforge.substack.com/p/dependency-day-a-single-file-in-browser)) made independence the literal mechanic — you sever supply lines from the Crown until colonies cascade free. Really sharp design thinking. It made me go the other direction: if that's the *work* of independence, what's the *celebration*? The moment after the vote passes?

**Fireworks Foundry** is a browser fireworks canvas set over an American skyline — Washington Monument, Capitol dome, lit windows, a crowd on the shore holding sparklers. Tap anywhere in the night sky to launch shells. Eight burst types, seven color palettes, music that syncs to the beat. The whole thing runs in one HTML file.

![Festive scene with crowd and string lights](assets/ff-festive.png)
![Finale word spelled in fireworks](assets/ff-spell.png)

## How the AI works

Two live Claude calls drive the creative layer:

- **Inspire** — Claude picks a shell and palette combo, names it ("Sapphire Halo", "Frost Crackle"), and fires a preview burst immediately so you see it in the sky
- **Director** — type a single sentence describing a vibe and Claude stages a full cinematic show: title card, three broadcast-style narration captions, a palette arc across the performance, a music track, and a finale word spelled out in fireworks particles at the climax. "Wedding toast for Sara and Jo" gives you SARA+JO in rose shells. "Triumphant July 4th" gives you 1776 in patriot colors.

Both fall back to built-in presets if the API is unreachable. Beat mode, a Grand Finale barrage, and a Poster save round out the controls.

## Where to play

**Demo:** [fireworks-foundry.vercel.app](https://fireworks-foundry.vercel.app)
**Code:** [github.com/GlimmerForge/summer-into-ai](https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/week-02-red-white-boom/demo-02-fireworks-foundry)

---

*Summer into AI 2026 · Theme 2: Red, White & Boom · Competitor reference: Dependency Day by [@merlinforge](https://merlinforge.substack.com/p/dependency-day-a-single-file-in-browser)*

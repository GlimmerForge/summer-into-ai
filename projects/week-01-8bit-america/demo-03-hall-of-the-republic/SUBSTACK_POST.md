# Summer Into AI Week 1 (Demo 3): I built a haunted museum where the witnesses talk back

I watched **RevereBike** by Eric Rhea ([@advisoryhour](https://advisoryhour.substack.com/p/summer-into-ai-2026-reverebike-or)) do something genuinely smart — it pulled mechanics from Founderman, Parade Candy Chaos, and Sky King into one mashup and shipped it fast. That move — synthesizing what everyone around you built — is exactly how AI enables a different kind of creative process.

That gave me a different question: what if instead of borrowing mechanics, I borrowed *ambition*? What's the most AI-native thing I could build for this theme?

**Hall of the Republic** is a first-person Wolfenstein-style walk through 250 years of American history. You move through a pixelated hall and encounter witnesses — a Revolutionary-era founder, a Civil War soldier, a suffragette, a civil rights marcher — each standing at their moment in time. You talk to them in free text. Claude generates their responses in character, grounded in the historical context of their era. They speak back in cinematic voices via ElevenLabs — each witness has a distinct voice tuned to their period. If no ElevenLabs key is present, it falls back gracefully to the browser's own speech synthesis. You can also speak to them with the mic button.

The wall plaques show real, verified facts. The dialogue is clearly AI — a historical impression, not a quotation. That distinction matters.

Three demos, one week, one theme. Each one a different answer to the same question: *what does 8-bit America sound like when the AI talks back?*

> Honesty note: the witnesses' words are AI-generated. Not quotations — impressions. The facts on the walls are real.

**Play it:** [hall-of-the-republic.vercel.app](https://hall-of-the-republic.vercel.app)
**Code:** [github.com/GlimmerForge/summer-into-ai](https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/week-01-8bit-america/demo-03-hall-of-the-republic)

*Theme connection: First-person retro hall aesthetic, 250 years of American history, three AI services working together — Claude, ElevenLabs, Web Speech API.*

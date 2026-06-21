# Summer into AI 2026: Hall of the Republic

![Hall of the Republic](assets/hall-title.png)

I watched **RevereBike** by Eric Rhea ([@advisoryhour](https://advisoryhour.substack.com/p/summer-into-ai-2026-reverebike-or)) pull mechanics from Founderman, Parade Candy Chaos, and Sky King into one mashup and ship it fast. That move — synthesizing what everyone around you is building — is exactly the kind of thing AI makes possible now. It gave me a different question: what if instead of borrowing mechanics, I borrowed ambition?

**Hall of the Republic** is a first-person Wolfenstein-style walk through 250 years of American history. You move through a pixelated hall and meet witnesses at their moment in time — a Revolutionary-era founder, a Civil War soldier, a suffragette, a civil rights marcher. You talk to them in free text. Claude generates their responses in character. They talk back using ElevenLabs voices tuned to their era. You can also speak to them with the mic button.

![Hall world](assets/01-hall-world.png)
![Talking to a witness](assets/hall-dialogue-voice.png)

## How the AI works

Three services running together:

- **Claude** — generates witness dialogue in character, grounded in their historical era
- **ElevenLabs** — distinct cinematic voice per witness (falls back to browser speech synthesis without a key)
- **Web Speech API** — mic input so you can speak your questions instead of typing

The wall plaques show real verified facts. The dialogue is clearly AI — a historical impression, not a quotation. That distinction matters and it's called out in the game.

## Three demos, one week

This is the third of three builds for Theme 1. Found a Republic was the civics sim. Liberty 1776 was the arcade shooter. This one is the most AI-native of the three — every conversation is generated live, every voice is synthesized, and no two visits to the hall sound the same.

## Where to play

**Demo:** [hall-of-the-republic.vercel.app](https://hall-of-the-republic.vercel.app)
**Code:** [github.com/GlimmerForge/summer-into-ai](https://github.com/GlimmerForge/summer-into-ai/tree/master/projects/week-01-8bit-america/demo-03-hall-of-the-republic)

---

*Summer into AI 2026 · Theme 1: 8-Bit America · Competitor reference: RevereBike by [@advisoryhour](https://advisoryhour.substack.com/p/summer-into-ai-2026-reverebike-or)*

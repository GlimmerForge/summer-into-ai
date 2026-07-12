import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

const EDITION_CONTEXT = {
  1: {
    date: 'Saturday, July 6, 1776',
    events: `- The Continental Congress adopted the Declaration of Independence on July 4 in Philadelphia; printed copies (the Dunlap broadside) are just now circulating.
- General Howe's British fleet arrived off Sandy Hook in late June and landed thousands of troops on Staten Island on July 2-3.
- News is arriving from the south: on June 28, the British naval attack on the palmetto-log fort on Sullivan's Island near Charleston, South Carolina was repulsed by Colonel Moultrie.
- General Washington's army is fortifying New-York City, expecting attack.
- The British evacuated Boston back in March; New England ports remain in American hands.`
  },
  2: {
    date: 'Saturday, July 13, 1776',
    events: `- The Declaration of Independence was read publicly for the first time in the State House Yard, Philadelphia, on July 8, to cheers and bonfires.
- On July 9, Washington had the Declaration read to the army in New-York; that night a crowd pulled down the gilded lead statue of King George III on Bowling Green, to be melted into musket balls.
- On July 12, the British warships Phoenix and Rose sailed up the Hudson (North River) past the American batteries, alarming the city.
- Admiral Lord Richard Howe's fleet is arriving from England to join his brother General Howe at Staten Island; the British force there grows daily.
- Charleston celebrates the June 28 victory at Sullivan's Island.`
  },
  3: {
    date: 'Saturday, July 20, 1776',
    events: `- On July 14, Lord Howe sent a letter addressed to "George Washington, Esq." — Washington's officers refused it because it did not acknowledge his rank as General.
- The Howe brothers are floating talk of a peace commission, offering pardons — but they have no power to treat with Congress as an independent body.
- The British force on Staten Island now numbers well over 20,000 as transports keep arriving; Hessian mercenaries are expected.
- Georgia and other colonies continue proclaiming the Declaration to celebrations.
- The American army in New-York digs in; skirmishing and small raids around the harbor islands.`
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const editionNumber = Math.min(3, Math.max(1, parseInt(body.editionNumber, 10) || 1));
  const usedHeadlines = Array.isArray(body.usedHeadlines) ? body.usedHeadlines.slice(0, 30) : [];
  const ctx = EDITION_CONTEXT[editionNumber];

  const systemPrompt = `You are the intelligence engine for "Stop the Presses", a 1776 disinformation game. The player is the printer of a Philadelphia broadsheet deciding which incoming dispatches to print. You generate each edition's incoming dispatches: a mix of GENUINE reports grounded in real July 1776 history and BRITISH DISINFORMATION — plausible fabrications planted by Loyalist agents and British intelligence to demoralize patriots or embarrass the printer.

Rules for every dispatch:
- Written in authentic 1776 newspaper English: formal, period spellings sparingly (New-York, to-day are fine), no modern idiom.
- Plain prose only. NO markdown of any kind — no #, no **, no *, no bullet characters.
- The body is 2-3 sentences, vivid and specific (names, places, dates).
- The source line says how it arrived: an express rider, a ship captain, a letter from a correspondent, a traveller lately from somewhere, etc.
- Headlines are short (under 10 words), suitable for wood type, may use capitals.

Rules for GENUINE dispatches (isTrue = true):
- Must be grounded in the real events listed for this edition, or minor plausible color consistent with them.
- The "tell" field explains briefly how the report could be corroborated (which riders, which papers, which witnesses).

Rules for DISINFORMATION dispatches (isTrue = false):
- Must be the kind of lie British intelligence would actually plant: Washington captured or resigning, Congress fleeing, a fabricated defeat, France declaring for Britain, smallpox devastating the army, a colony renouncing independence, etc.
- It must be SEDUCTIVE — dramatic, printable, tempting for circulation.
- It must contain exactly one subtle flaw a careful printer might catch: an impossible travel time, wrong geography, a source with no way of knowing, a detail contradicting well-known fact, suspiciously convenient timing. Embed the flaw naturally in the body text.
- The "tell" field names that flaw plainly (one sentence), for the reveal phase.

Do NOT reuse any of these already-used headlines or their core claims: ${usedHeadlines.length ? usedHeadlines.join(' | ') : '(none yet)'}.
Shuffle the true and false dispatches together in a random order — never group them.`;

  const userMessage = `Generate Edition ${editionNumber} of 3, dated ${ctx.date}.

Real events around this date (ground truth for genuine dispatches):
${ctx.events}

Produce EXACTLY 5 dispatches: EXACTLY 3 genuine (isTrue true) and EXACTLY 2 British disinformation (isTrue false), in shuffled order. Give each a unique id like "e${editionNumber}-d1" through "e${editionNumber}-d5" (order on the page, not truth order).`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      tools: [{
        name: 'deliver_dispatches',
        description: 'Deliver the full set of incoming dispatches for this edition of the broadsheet.',
        input_schema: {
          type: 'object',
          required: ['editionDate', 'dispatches'],
          properties: {
            editionDate: { type: 'string', description: 'The edition date line, e.g. "Saturday, July 6, 1776"' },
            dispatches: {
              type: 'array',
              minItems: 5,
              maxItems: 5,
              items: {
                type: 'object',
                required: ['id', 'source', 'headline', 'body', 'isTrue', 'tell'],
                properties: {
                  id: { type: 'string' },
                  source: { type: 'string', description: 'How the dispatch arrived — rider, letter, ship, traveller' },
                  headline: { type: 'string', description: 'Wood-type headline, under 10 words' },
                  body: { type: 'string', description: '2-3 sentences of period newspaper prose, plain text, no markdown' },
                  isTrue: { type: 'boolean', description: 'true = genuine report, false = British disinformation' },
                  tell: { type: 'string', description: 'For false: the one subtle flaw hidden in the body. For true: how it could be corroborated.' }
                }
              }
            }
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'deliver_dispatches' },
      messages: [{ role: 'user', content: userMessage }]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse || !Array.isArray(toolUse.input?.dispatches) || toolUse.input.dispatches.length < 4) {
      return res.status(502).json({ error: 'Dispatch generation returned malformed data' });
    }

    const dispatches = toolUse.input.dispatches.slice(0, 5).map((d, i) => ({
      id: String(d.id || `e${editionNumber}-d${i + 1}`),
      source: String(d.source || 'By an unknown hand'),
      headline: String(d.headline || 'INTELLIGENCE RECEIVED'),
      body: String(d.body || ''),
      isTrue: Boolean(d.isTrue),
      tell: String(d.tell || '')
    }));

    return res.status(200).json({
      editionNumber,
      editionDate: String(toolUse.input.editionDate || ctx.date),
      dispatches
    });
  } catch (err) {
    console.error('dispatches error:', err);
    return res.status(500).json({ error: err.message || 'Dispatch generation failed' });
  }
}

import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!process.env.ANTHROPIC_API_KEY) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'ANTHROPIC_API_KEY is not configured' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    return res.end();
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    editionNumber = 1,
    editionDate = 'July 1776',
    printed = [],
    held = [],
    circulation = 0,
    reputation = 100
  } = body;

  const printedLines = printed.length
    ? printed.map(p => `- "${p.headline}" — ${p.isTrue ? 'a GENUINE report' : 'BRITISH DISINFORMATION, now exposed as false'}`).join('\n')
    : '(the printer ran a nearly blank sheet — nothing of substance printed)';
  const heldLines = held.length
    ? held.map(h => `- "${h.headline}" — ${h.isTrue ? 'genuine news the town did NOT get from this paper (rival printers may have it)' : 'a British plant the printer wisely kept off the page'}`).join('\n')
    : '(nothing was held back)';

  const systemPrompt = `You are the voice of the reading public of Philadelphia in July 1776 — specifically the crowd at the London Coffee-House and the taverns near the printing office, reacting the morning a broadsheet edition hits the street.

Write a short town-reaction vignette: 2 short paragraphs, plain prose, NO markdown of any kind (no #, no **, no *). Period voice, concrete and human: name a drayman, a merchant's widow, an officer of the Associators, an apprentice — small vivid figures. Quote a line or two of tavern talk in plain quotation marks.

React honestly to the edition:
- Genuine scoops printed: excitement, papers sold out, the printer's name toasted.
- British disinformation printed: within the vignette, word arrives that the story is false — anger, mockery, muttering that the printer serves Lord Howe; the shame lands on the printer.
- A wisely held British plant (mention only if notable): a rival printed the lie and was laughed at, or a quiet nod to the printer's judgment.
- A blank or thin sheet: grumbling that the printer has lost his nerve.

Never mention game mechanics, scores, or being an AI. End on a line that captures the printer's standing in the town this week.`;

  const userMessage = `Edition ${editionNumber} of 3, dated ${editionDate}, is on the street.

What the printer PRINTED (and the truth of it):
${printedLines}

What the printer HELD BACK:
${heldLines}

The paper's circulation now stands near ${circulation} and the printer's reputation is ${reputation} of 100.

Write the town's reaction.`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'text', delta: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('reaction error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message || 'Reaction failed' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
}

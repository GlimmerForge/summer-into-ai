import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { companyName, total, exhibits } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) res.flushHeaders();

  if (!process.env.ANTHROPIC_API_KEY) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    return res.end();
  }

  if (!Array.isArray(exhibits) || exhibits.length !== 3) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Exactly 3 exhibits required' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    return res.end();
  }

  const exhibitText = exhibits.map(e =>
    `EXHIBIT ${e.exhibitLetter}: "${e.title}"
- Supporting complaints in sample: ${e.complaintCount}
- Plaintiff's claimed strength: ${e.strength}/10
- Legal theory: ${e.legalTheory}
- Representative narrative: "${(e.sampleNarrative || '').slice(0, 300)}"`
  ).join('\n\n');

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      thinking: { type: 'enabled', budget_tokens: 2500 },
      system: `You are lead defense counsel for ${companyName} in a consumer class action. You are ruthless, precise, and expensive. Your job: dismantle the plaintiff's THREE specific exhibits, attacking each BY NAME (Exhibit A, Exhibit B, Exhibit C).

Structure: a one-sentence opening, then one paragraph per exhibit (in order A, B, C), then a two-sentence closing demanding dismissal. Each exhibit paragraph must open with the exhibit name (e.g. "Exhibit B rests on...") and attack its specific weaknesses: thin complaint counts, unverified narratives, lack of alleged actual damages, causation gaps, statute-of-limitations issues, individualized facts that defeat class certification, or that complaint volume merely reflects market share.

Rules: plain prose only — NO markdown of any kind (no #, no **, no *, no bullet points, no numbered lists). Keep paragraphs to 3-4 punchy sentences. Cite the actual numbers from the exhibits. Be dramatic but legally grounded. Total length around 250-350 words.`,
      messages: [{
        role: 'user',
        content: `The plaintiff class has filed against ${companyName}, citing ${total} total complaints on file with the CFPB. They selected these three exhibits:

${exhibitText}

Deliver your defense argument attacking each exhibit by name.`
      }],
      stream: true
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta' && d.thinking) {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'text_delta' && d.text) {
          res.write(`data: ${JSON.stringify({ type: 'text', delta: d.text })}\n\n`);
        }
      }
    }
  } catch (e) {
    console.error('defense error:', e);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Defense counsel is unavailable: ' + (e.message || 'unknown error') })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}

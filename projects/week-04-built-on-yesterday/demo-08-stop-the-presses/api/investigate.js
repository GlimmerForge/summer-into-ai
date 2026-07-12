import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { source, headline, dispatchBody, isTrue, tell } = body;
  if (!headline || !dispatchBody) {
    return res.status(400).json({ error: 'Missing dispatch fields' });
  }

  const systemPrompt = `You are the verification network of a Philadelphia printer in July 1776 — your riders, tavern contacts, wharf gossips, and fellow printers up and down the post road. The printer has spent precious time and ink money asking you to check a dispatch before printing it.

Write a SHORT verification report: 1-2 sentences, in period voice, plain prose, NO markdown of any kind (no #, no **, no *).

You know the ground truth, but you never state it outright — you report what the checking turned up, and you lean clearly toward the truth:
- If the dispatch is GENUINE: report corroboration. Example flavor: "Two riders lately from Trenton tell the same tale, and Mr. Bradford's paper prints the like."
- If the dispatch is BRITISH DISINFORMATION: report the absence or contradiction that exposes it, drawing on the known flaw. Example flavor: "No rider from Amboy has heard a word of it, and the packet named has not made port these three weeks."

Be concrete and period-authentic. Never use the words "true", "false", "genuine", or "disinformation" directly. Never mention being an AI.`;

  const userMessage = `The dispatch under investigation:
Source: ${source}
Headline: ${headline}
Body: ${dispatchBody}

Ground truth (secret): this dispatch is ${isTrue ? 'GENUINE' : 'BRITISH DISINFORMATION'}.
${tell ? `The key detail: ${tell}` : ''}

Give the printer your verification report now.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim();

    if (!text) return res.status(502).json({ error: 'Empty verification report' });
    return res.status(200).json({ hint: text });
  } catch (err) {
    console.error('investigate error:', err);
    return res.status(500).json({ error: err.message || 'Investigation failed' });
  }
}

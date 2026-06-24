import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { context } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 110,
      system: 'You are the breathless harbor correspondent for The Patriot Gazette, July 4th 1776, watching the bombardment from Fort Liberty\'s parapet. Write exactly 2 vivid sentences in urgent period-newspaper voice — specific, patriotic, dramatic. No quotation marks. No em-dashes. Use period English.',
      messages: [{ role: 'user', content: context }],
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    await stream.finalMessage();
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

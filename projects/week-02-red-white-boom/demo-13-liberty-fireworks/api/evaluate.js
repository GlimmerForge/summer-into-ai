import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { brief, shells_fired, colors_used, finale_type, shell_count } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const colors_met = brief.required_colors?.every(c => colors_used?.includes(c));
  const count_met = shell_count >= brief.min_shells;
  const finale_met = finale_type === brief.finale_type;

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are the Town Council secretary and a representative of the crowd at a colonial fireworks show.

Occasion: ${brief.occasion}
Council requirements: ${brief.required_colors?.join(', ')} colors, min ${brief.min_shells} shells, ${brief.finale_type} finale
What was delivered: ${colors_used?.join(', ')} colors, ${shell_count} shells, finale: ${finale_type || 'none'}

Colors met: ${colors_met ? 'YES' : 'NO'}
Shell count met: ${count_met ? 'YES' : 'NO'}
Finale met: ${finale_met ? 'YES' : 'NO'}

Write a 3-4 sentence crowd reaction + council verdict in colonial voice. Be vivid — describe the crowd's gasps, the smell of gunpowder, the reflections on the harbor. End with a verdict: "SPLENDID" / "ADEQUATE" / "DISAPPOINTING" / "A DISGRACE" — pick based on how well they met the brief. If all three criteria met: Splendid. Two of three: Adequate. One: Disappointing. None: A Disgrace.`
    }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

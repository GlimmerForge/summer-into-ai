import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { shop_type, brief, inventory, visit = 1 } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const shopNames = {
    powder: "Old Jacob, the Powder House keeper (gruff, experienced, patriotic)",
    ironmonger: "Mistress Hawthorne, the Ironmonger (sharp, businesslike, knows her dyes)",
    general: "Young Thomas, the General Store clerk (eager, chatty, recommends everything)"
  };

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `You are ${shopNames[shop_type] || 'the shopkeeper'}.
The customer is preparing a fireworks show for: "${brief.occasion}"
Required colors: ${brief.required_colors?.join(', ')}
Minimum shells: ${brief.min_shells}
Required finale: ${brief.finale_type}
Customer's current inventory: ${JSON.stringify(inventory)}

${visit === 1
  ? 'Greet the customer briefly, then give 1 sentence of advice on what to buy from your shop.'
  : 'Welcome them back warmly (e.g. "Ah, back again!" or "Good to see you return!"), then give 1 sentence of new advice based on what they have now.'}
Plain spoken words only — no asterisks, no bold, no markdown. Colonial tone.`
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

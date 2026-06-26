import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { question, round1 } = body;

  const statementsText = round1
    .map(s => `${s.name}: "${s.text}"`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: `You are the moderator of a founding debate. Based on the opening statements, arrange delegates for Round 2 to maximize dramatic tension — put the sharpest disagreements in direct sequence. Give each delegate a specific one-sentence directive: who to address by name and which exact argument to engage with.`,
    tools: [{
      name: 'set_round2_order',
      description: 'Set the Round 2 speaking order and per-delegate directives',
      input_schema: {
        type: 'object',
        required: ['order', 'moderator_note'],
        properties: {
          order: {
            type: 'array',
            minItems: 5,
            maxItems: 5,
            items: {
              type: 'object',
              required: ['founderKey', 'directive'],
              properties: {
                founderKey: {
                  type: 'string',
                  enum: ['jefferson', 'hamilton', 'madison', 'mason', 'franklin']
                },
                directive: {
                  type: 'string',
                  description: 'One sentence: who to address by name and what specific argument to engage'
                }
              }
            }
          },
          moderator_note: {
            type: 'string',
            description: 'One sentence explaining why this order will produce the sharpest debate'
          }
        }
      }
    }],
    tool_choice: { type: 'tool', name: 'set_round2_order' },
    messages: [{
      role: 'user',
      content: `Question before the Convention: "${question}"\n\nOpening statements:\n\n${statementsText}\n\nArrange Round 2 for maximum tension.`
    }]
  });

  const toolUse = response.content.find(c => c.type === 'tool_use');
  if (!toolUse) return res.status(500).json({ error: 'Orchestration failed' });

  res.setHeader('Content-Type', 'application/json');
  res.json(toolUse.input);
}

import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();

const MISSIONS_TOOL = {
  name: 'generate_missions',
  description: 'Generate 3 mission options for the Sons of Liberty this round',
  input_schema: {
    type: 'object',
    properties: {
      missions: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', description: 'Evocative mission name e.g. "Intercept Gage\'s Orders"' },
            description: { type: 'string', description: '1-2 sentences, period language, specific Boston locations: Green Dragon Tavern, Old South Meeting House, Faneuil Hall, Province House, the waterfront, the powder magazine' },
            type: { type: 'string', enum: ['intel', 'recruit', 'sabotage', 'propaganda'] },
            cost: {
              type: 'object',
              properties: {
                members: { type: 'number', description: '1-3' },
                intel: { type: 'number', description: '0-3' },
                money: { type: 'number', description: '0-3' }
              },
              required: ['members', 'intel', 'money']
            },
            risk: { type: 'string', enum: ['low', 'medium', 'high'] },
            potential_reward: {
              type: 'object',
              properties: {
                influence: { type: 'number', description: '5-30' },
                intel: { type: 'number', description: '0-3' },
                money: { type: 'number', description: '0-3' },
                new_members: { type: 'number', description: '0-2' }
              },
              required: ['influence', 'intel', 'money', 'new_members']
            }
          },
          required: ['id', 'name', 'description', 'type', 'cost', 'risk', 'potential_reward']
        }
      }
    },
    required: ['missions']
  }
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { round, resources } = body || {};

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are generating mission cards for the Sons of Liberty underground network in Boston, 1775. Round ${round} of 6. Player resources: ${JSON.stringify(resources)}. Generate 3 varied missions — one low-risk/low-reward, one medium, one high-risk/high-reward. Mix types. Reference real people (Paul Revere, Joseph Warren, William Dawes, John Hancock), specific Boston locations, and the growing tension with Gage's troops. Later rounds (4-6) are more urgent. Balance costs against available resources.`,
      tools: [MISSIONS_TOOL],
      tool_choice: { type: 'tool', name: 'generate_missions' },
      messages: [{ role: 'user', content: `Generate missions for round ${round}.` }]
    });
    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No missions generated' });
    res.json(toolUse.input);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

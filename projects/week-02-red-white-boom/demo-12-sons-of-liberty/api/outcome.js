import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();

const OUTCOME_TOOL = {
  name: 'mission_outcome',
  description: 'Generate the outcome of a Sons of Liberty mission',
  input_schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', description: 'Low risk: 85% success. Medium: 65%. High: 45%.' },
      outcome_description: { type: 'string', description: '2-3 sentences atmospheric narrative. Period language, Boston locations. Success: triumphant but careful. Failure: tense, dangerous.' },
      resources_gained: {
        type: 'object',
        properties: {
          influence: { type: 'number' },
          intel: { type: 'number' },
          money: { type: 'number' },
          new_members: { type: 'number' }
        },
        required: ['influence', 'intel', 'money', 'new_members']
      },
      members_captured: { type: 'number', description: 'High risk failure: 1-2. Medium failure: 0-1. Low failure: 0. Success: always 0.' },
      historical_flavor: { type: 'string', description: 'One real historical fact about the Sons of Liberty or this type of operation.' },
      scene_prompt: { type: 'string', description: 'A vivid 18th-century oil painting prompt for this outcome moment. e.g. "Colonial spies exchanging documents by candlelight in a Boston tavern cellar, 1775, dramatic chiaroscuro lighting" or "British redcoats searching a colonial home at night, 1775 Boston, torchlight, alarmed family". Used for image generation.' }
    },
    required: ['success', 'outcome_description', 'resources_gained', 'members_captured', 'historical_flavor', 'scene_prompt']
  }
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { mission, round } = body || {};

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are narrating a Sons of Liberty mission outcome in Boston, 1775. Round ${round} of 6. Generate a scene_prompt that would make a vivid 18th-century oil painting — include lighting style, setting, figures, mood. It must be historically grounded.`,
      tools: [OUTCOME_TOOL],
      tool_choice: { type: 'tool', name: 'mission_outcome' },
      messages: [{ role: 'user', content: `Mission: ${JSON.stringify(mission)}` }]
    });
    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No outcome generated' });
    res.json(toolUse.input);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

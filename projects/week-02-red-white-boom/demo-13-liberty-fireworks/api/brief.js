import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const occasions = [
    "Boston's first Fourth of July celebration, 1777 — one year after independence",
    "Yorktown Victory Celebration, October 1781 — Cornwallis has surrendered",
    "Philadelphia Independence Day, July 4th 1778 — British have evacuated the city",
    "Washington's inauguration celebration, April 1789",
    "The Treaty of Paris is signed — peace at last, September 1783",
    "General Washington's birthday celebration, February 1782, at Valley Forge",
  ];
  const occasion = occasions[Math.floor(Math.random() * occasions.length)];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    tools: [{
      name: 'set_show_brief',
      description: 'Set the fireworks show requirements from the Town Council',
      input_schema: {
        type: 'object',
        properties: {
          occasion: { type: 'string' },
          required_colors: { type: 'array', items: { type: 'string' }, description: '2-3 colors required in the show' },
          min_shells: { type: 'number', description: 'minimum number of shells to fire, between 6 and 12' },
          finale_type: { type: 'string', enum: ['Chrysanthemum', 'Willow', 'Peony', 'Star Shell'], description: 'required finale shell type' },
          crowd_size: { type: 'string', enum: ['modest', 'large', 'grand'] },
          council_note: { type: 'string', description: 'Short note from the Town Council, 1-2 sentences, in colonial voice' }
        },
        required: ['occasion', 'required_colors', 'min_shells', 'finale_type', 'crowd_size', 'council_note']
      }
    }],
    tool_choice: { type: 'tool', name: 'set_show_brief' },
    messages: [{
      role: 'user',
      content: `You are the Town Council secretary for a colonial American town in 1776-1789.
The occasion is: "${occasion}"
Generate a fireworks show brief for the pyrotechnist. Required colors should match the occasion (e.g., red/white/blue for patriotic, gold/white for celebration). Min shells 6-12 based on crowd size.`
    }]
  });

  const tool = response.content.find(b => b.type === 'tool_use');
  res.json(tool.input);
}

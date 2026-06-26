import Anthropic from '@anthropic-ai/sdk';
import { FOUNDERS } from './speak.js';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { founderKey, question, history = [] } = body;

  const founder = FOUNDERS[founderKey];
  if (!founder) return res.status(400).json({ error: 'Unknown founder' });

  const historyText = history.map(h => `${h.name}: "${h.text}"`).join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 220,
    system: `${founder.system}\n\nYou are listening to an ongoing debate. Decide — quickly and honestly — whether you have something urgent and specific to add. Don't respond just to respond. If another delegate already made your point, hold back. Only flag 'high' urgency if you cannot let an argument stand unanswered.`,
    tools: [{
      name: 'register_reaction',
      description: 'Register whether you want to speak and why',
      input_schema: {
        type: 'object',
        required: ['wantsToRespond'],
        properties: {
          wantsToRespond: {
            type: 'boolean',
            description: 'Do you urgently want the floor?'
          },
          targetFounder: {
            type: 'string',
            enum: ['jefferson', 'hamilton', 'madison', 'mason', 'franklin'],
            description: 'Who are you responding to? Required if wantsToRespond is true.'
          },
          targetArgument: {
            type: 'string',
            description: 'The specific claim you want to challenge or build on — one concise phrase.'
          },
          urgency: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'high = cannot let this stand; low = would add something but not critical'
          }
        }
      }
    }],
    tool_choice: { type: 'tool', name: 'register_reaction' },
    messages: [{
      role: 'user',
      content: `Question before the Convention: "${question}"\n\nDebate so far:\n\n${historyText}\n\nDo you want to respond?`
    }]
  });

  const toolUse = response.content.find(c => c.type === 'tool_use');
  if (!toolUse) return res.json({ founderKey, wantsToRespond: false });

  res.setHeader('Content-Type', 'application/json');
  res.json({ founderKey, ...toolUse.input });
}

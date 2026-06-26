import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { question, debate } = body;

  const transcript = debate
    .map(d => `[Round ${d.round}] ${d.name}: ${d.text}`)
    .join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    tools: [{
      name: 'analyze_debate',
      description: 'Produce a structured historical analysis of this founding debate',
      input_schema: {
        type: 'object',
        required: ['points_of_agreement', 'fault_lines', 'sharpest_exchange', 'most_prescient', 'verdict'],
        properties: {
          points_of_agreement: {
            type: 'array',
            items: { type: 'string' },
            description: '2–3 specific points where the delegates found common ground'
          },
          fault_lines: {
            type: 'array',
            items: {
              type: 'object',
              required: ['issue', 'federalist_side', 'anti_federalist_side'],
              properties: {
                issue: { type: 'string', description: 'The core tension in 6–10 words' },
                federalist_side: {
                  type: 'object',
                  required: ['delegates', 'position'],
                  properties: {
                    delegates: { type: 'array', items: { type: 'string' } },
                    position: { type: 'string', description: '1 sentence' }
                  }
                },
                anti_federalist_side: {
                  type: 'object',
                  required: ['delegates', 'position'],
                  properties: {
                    delegates: { type: 'array', items: { type: 'string' } },
                    position: { type: 'string', description: '1 sentence' }
                  }
                }
              }
            },
            description: '2–3 major fault lines that emerged'
          },
          sharpest_exchange: {
            type: 'object',
            required: ['between', 'on'],
            properties: {
              between: { type: 'array', items: { type: 'string' }, description: 'Two delegate names' },
              on: { type: 'string', description: 'The specific point of sharpest disagreement, 1–2 sentences' }
            }
          },
          most_prescient: {
            type: 'object',
            required: ['delegate', 'what_they_said', 'why_prescient'],
            properties: {
              delegate: { type: 'string' },
              what_they_said: { type: 'string', description: 'The insight they offered, paraphrased' },
              why_prescient: { type: 'string', description: 'How history bore them out, 1 sentence' }
            }
          },
          verdict: {
            type: 'string',
            description: 'What this convention would most likely have concluded, what compromise they might have struck, and what it would have left unresolved. 2–3 sentences grounded in their actual historical patterns of compromise.'
          }
        }
      }
    }],
    tool_choice: { type: 'tool', name: 'analyze_debate' },
    messages: [{
      role: 'user',
      content: `Question debated: "${question}"\n\nFull debate transcript:\n${transcript}\n\nAnalyze this debate with historical accuracy. Ground the synthesis in what these delegates actually believed and how they actually compromised at the Convention.`
    }]
  });

  const toolUse = response.content.find(c => c.type === 'tool_use');
  if (!toolUse) return res.status(500).json({ error: 'Synthesis failed' });

  res.setHeader('Content-Type', 'application/json');
  res.json(toolUse.input);
}

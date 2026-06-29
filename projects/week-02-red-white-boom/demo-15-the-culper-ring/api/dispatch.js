import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const MISSION_TYPES = [
  'British troop movement through Manhattan toward Brooklyn',
  'Royal Navy fleet position and supply shipment interception',
  'Identification of a high-value British officer and his headquarters',
  'Enemy fortification plans and planned attack on Continental positions'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { roundNum = 1, previousOutcome = null } = body;

  const missionType = MISSION_TYPES[(roundNum - 1) % MISSION_TYPES.length];

  const contextNote = previousOutcome
    ? `The previous dispatch outcome was: ${previousOutcome}. Build on that continuity.`
    : 'This is the first dispatch in the intelligence chain.';

  const systemPrompt = `You are generating an authentic American Revolutionary War intelligence dispatch for Washington's Culper Ring spy network, 1778-1781. Use genuine tradecraft conventions:

Cover names:
- "711" = Washington (the recipient, referred to indirectly)
- "C——r" = Abraham Woodhull (Samuel Culper)
- "C——r Jr." = Robert Townsend (Samuel Culper Jr.)
- "John Bolton" = Benjamin Tallmadge
- "the Farmer" or "the General of the North" = a British officer (never named directly)
- "the Friend" = a loyalist contact who feeds intelligence

Location codes:
- "10" = New York City
- "20" = Setauket
- "30" = Oyster Bay

Tradecraft language:
- "the medicine" or "under the medicine" = written in invisible ink (ferrous sulfate solution)
- "the counterpart" = the reagent that reveals invisible ink
- "wool" or "the flock" = soldiers/troops
- "the mill" = a strategic location used as a reference point
- "the usual route" = the relay chain: NYC -> Setauket -> Oyster Bay -> Brewster's whaleboat -> Long Island Sound

The dispatch should read as period-authentic cipher — comprehensible to someone with the codebook above, opaque without it. It must be written in 18th-century English style, roughly 120-180 words. Generate a new dispatch about: ${missionType}. Round ${roundNum} of 4. ${contextNote}`;

  let response;
  try {
    response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools: [
      {
        name: 'generate_dispatch',
        description: 'Generate an intelligence dispatch with translation and operational options',
        input_schema: {
          type: 'object',
          properties: {
            dispatchText: {
              type: 'string',
              description: 'The intercepted message in period cipher language (120-180 words). Must use the cover names, location codes, and tradecraft language exactly as specified.'
            },
            translation: {
              type: 'string',
              description: 'Plain English translation revealing what the dispatch actually means, sentence by sentence. Reveal all the intelligence contained in the message.'
            },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Single letter: A, B, or C' },
                  label: { type: 'string', description: 'Short action label (5-8 words)' },
                  description: { type: 'string', description: 'What this action means operationally (1 sentence)' }
                },
                required: ['id', 'label', 'description']
              },
              description: 'Exactly 3 operational options the agent must choose from. One should be clearly correct, one plausible but wrong, one clearly wrong.'
            },
            correctOptionId: {
              type: 'string',
              description: 'The id (A, B, or C) of the best operational choice based on the intelligence in this dispatch'
            },
            historical_context: {
              type: 'string',
              description: 'One sentence of real historical context about this type of intelligence operation or the Culper Ring'
            }
          },
          required: ['dispatchText', 'translation', 'options', 'correctOptionId', 'historical_context']
        }
      }
    ],
    tool_choice: { type: 'any' }
    });
  } catch (err) {
    console.error('dispatch error:', err);
    return res.status(500).json({ error: err.message || 'Claude call failed' });
  }

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) {
    return res.status(500).json({ error: 'No structured output from model' });
  }

  return res.status(200).json(toolUse.input);
}

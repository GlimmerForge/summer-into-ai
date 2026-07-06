import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { missionNumber, missionType, previousDecisions = [] } = body;

  const systemPrompt = `You are generating authentic Culper Ring spy mission content set in 1779 Revolutionary War America.
Historical context: The Culper Ring operated 1778-1783. Key agents: Samuel Culper Sr. (Abraham Woodhull), Samuel Culper Jr. (Robert Townsend), Agent 355 (unknown identity), John Bolton (Benjamin Tallmadge), Jonas (Caleb Brewster). Washington's codename was 711.
Previous player decisions: ${JSON.stringify(previousDecisions)}

For decode missions: Create a realistic cipher dispatch using number codes (711=Washington) and period tradecraft. Make it genuinely cryptic but solvable.
For compose missions: Give a scenario where the player must write disinformation. Describe exactly what false information is needed.
For decision missions: A genuine moral dilemma — network security vs. agent loyalty, or similar. Make the choice genuinely hard.`;

  const missionContext = {
    1: 'Opening mission. Gentle introduction to the cipher system. Routine intelligence.',
    2: 'Harder dispatch. British troop movements threatening a key position.',
    3: 'Washington needs the British to believe he attacks New York when he plans to march south.',
    4: 'Crisis: Agent 355 has been seen at a British social function. Her loyalty is in question.',
    5: 'The final dispatch. Everything is at stake. The war or the network.'
  }[missionNumber] || 'Continue the mission arc.';

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      tools: [{
        name: 'generate_mission',
        description: 'Generate a structured Culper Ring spy mission',
        input_schema: {
          type: 'object',
          required: ['missionNumber', 'type', 'dispatch', 'cipherKey', 'scenario', 'options', 'hiddenMission', 'affectedAgent'],
          properties: {
            missionNumber: { type: 'number', description: 'The mission number 1-5' },
            type: { type: 'string', enum: ['decode', 'compose', 'decision'] },
            dispatch: { type: 'string', description: 'The encoded cipher message (decode), the mission directive (compose), or the crisis situation (decision). 80-150 words.' },
            cipherKey: { type: 'string', description: 'Hint about the cipher system used. Empty string for non-decode missions.' },
            scenario: { type: 'string', description: '2-3 sentences of narrative setup and historical context for this mission.' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Exactly 3 player choices. For decode: possible interpretations of the intelligence. For compose: three disinformation approaches. For decision: the actual choices (e.g., "Burn Agent 355 to protect the network").'
            },
            hiddenMission: { type: 'string', description: 'What the dispatch actually reveals (decode), the optimal disinformation approach (compose), or the strategically correct decision rationale (decision). Used to judge player response.' },
            affectedAgent: { type: 'string', description: 'The agent ID most central to this mission: culper_sr, culper_jr, agent_355, tallmadge, or brewster. Empty string if none.' }
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'generate_mission' },
      messages: [{ role: 'user', content: `Generate mission ${missionNumber} of type "${missionType}". ${missionContext}` }]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No structured output from model' });

    return res.status(200).json(toolUse.input);
  } catch (err) {
    console.error('Mission generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}

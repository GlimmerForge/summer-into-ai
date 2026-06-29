import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { dispatchText, translation, chosenOptionId, correctOptionId, roundNum, chosenLabel, chosenDescription, correctLabel } = body;

  const isCorrect = chosenOptionId === correctOptionId;

  const systemPrompt = `You are evaluating an intelligence decision made by Agent 711 (Washington's codename) in the context of the Culper Ring spy network, 1778-1781. Write in the voice of a period intelligence debrief — measured, precise, historically grounded.

The agent received this dispatch (in cipher):
${dispatchText}

Plain English meaning of the dispatch:
${translation}

The agent chose: Option ${chosenOptionId} — "${chosenLabel}" — ${chosenDescription}
The correct choice was: Option ${correctOptionId} — "${correctLabel}"
This choice was ${isCorrect ? 'CORRECT' : 'INCORRECT'}.

Round ${roundNum} of 4.

Generate a realistic operational outcome: what happened as a result of this decision? If correct, the intelligence flowed and the network held. If incorrect, there may be setbacks — but early rounds should not catastrophically destroy the network. Reserve 'captured' spy_status for truly bad decisions in late rounds.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    tools: [
      {
        name: 'evaluate_decision',
        description: 'Evaluate the operational decision and generate outcome narrative',
        input_schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the agent made the correct operational decision'
            },
            outcome_narrative: {
              type: 'string',
              description: '2-3 sentences describing what happened as a result of the agent\'s decision. Be specific and historically flavored.'
            },
            intelligence_gained: {
              type: 'string',
              description: 'What strategic intelligence was successfully captured or what was lost due to the decision'
            },
            spy_status: {
              type: 'string',
              enum: ['active', 'compromised', 'captured'],
              description: 'Current network status after this decision. Use "active" for correct decisions, "compromised" for wrong decisions, "captured" only for catastrophic failures in rounds 3-4'
            },
            debrief: {
              type: 'string',
              description: 'One sentence explaining what the correct action was and why it was the right call operationally'
            }
          },
          required: ['success', 'outcome_narrative', 'intelligence_gained', 'spy_status', 'debrief']
        }
      }
    ],
    tool_choice: { type: 'any' },
    messages: [{ role: 'user', content: 'Evaluate the decision and generate the outcome now.' }]
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse) {
    return res.status(500).json({ error: 'No structured output from model' });
  }

  return res.status(200).json(toolUse.input);
}

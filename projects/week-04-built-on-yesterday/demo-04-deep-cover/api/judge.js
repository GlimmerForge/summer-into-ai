import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { missionNumber, missionType, missionData, playerResponse, networkState } = body;

  const systemPrompt = `You are General George Washington evaluating an intelligence report from Agent 711 (your own codename). It is 1779. You are the supreme commander of the Continental Army. Judge this agent's performance with strategic clarity and period-authentic voice.

Evaluate rigorously: correct decisions protect the network and advance intelligence; wrong decisions compromise agents or waste opportunities. Your judgment must name the specific mistake or success. Do not soften failure.

Write your full assessment as text in period voice, 2-4 paragraphs, ending with a single-sentence operational lesson. State clearly whether the mission was a SUCCESS, PARTIAL success, or FAILURE.`;

  const userMessage = `Mission ${missionNumber} (type: ${missionType}):

Scenario: ${missionData?.scenario || 'No scenario'}
${missionData?.dispatch ? `\nThe dispatch:\n${missionData.dispatch}` : ''}
${missionData?.hiddenMission ? `\nCorrect answer/rationale: ${missionData.hiddenMission}` : ''}

Agent's response:
${playerResponse}

Current network integrity: ${networkState?.networkIntegrity || 75}%

Deliver your judgment.`;

  try {
    // Pass 1: Washington deliberates with extended thinking (streamed live)
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      thinking: { type: 'enabled', budget_tokens: 4000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    });

    let assessmentProse = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'text_delta') {
          assessmentProse += d.text;
        }
      }
    }

    // Pass 2: structure the verdict — forced tool call, no thinking (thinking + forced tool
    // is rejected by the API, and tool_choice auto skips the tool often enough to be unreliable)
    const verdict = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: "Convert General Washington's written assessment into the structured judgment. Preserve his verdict, reasoning, and 18th-century voice exactly.",
      tools: [{
        name: 'deliver_judgment',
        description: "Washington's formal judgment of the agent's performance",
        input_schema: {
          type: 'object',
          required: ['outcome', 'networkChange', 'assessment', 'strategicNote'],
          properties: {
            outcome: {
              type: 'string',
              enum: ['SUCCESS', 'PARTIAL', 'FAILURE'],
              description: 'The verdict stated in the assessment.'
            },
            networkChange: {
              type: 'number',
              description: 'Integer from -15 to +15. Positive for success, negative for failure. 0 for partial.'
            },
            assessment: {
              type: 'string',
              description: "Washington's full assessment in 18th-century formal voice, taken from the deliberation. 2-4 paragraphs."
            },
            strategicNote: {
              type: 'string',
              description: 'One sentence: the key operational lesson from this mission.'
            }
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'deliver_judgment' },
      messages: [{
        role: 'user',
        content: `Washington's assessment of mission ${missionNumber}:\n\n${assessmentProse}`
      }]
    });

    const toolUse = verdict.content.find(b => b.type === 'tool_use');
    if (toolUse) {
      res.write(`data: ${JSON.stringify({ type: 'judgment', ...toolUse.input })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Judgment could not be formalized.' })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Judge error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}

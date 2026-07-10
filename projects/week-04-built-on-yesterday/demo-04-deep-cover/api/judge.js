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

You MUST deliver your verdict by calling the deliver_judgment tool — never answer in plain text.`;

  const userMessage = `Mission ${missionNumber} (type: ${missionType}):

Scenario: ${missionData?.scenario || 'No scenario'}
${missionData?.dispatch ? `\nThe dispatch:\n${missionData.dispatch}` : ''}
${missionData?.hiddenMission ? `\nCorrect answer/rationale: ${missionData.hiddenMission}` : ''}

Agent's response:
${playerResponse}

Current network integrity: ${networkState?.networkIntegrity || 75}%

Deliver your judgment.`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 6000 },
      system: systemPrompt,
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
              description: 'SUCCESS if agent made the correct decision, PARTIAL if partially correct, FAILURE if wrong.'
            },
            networkChange: {
              type: 'number',
              description: 'Integer from -15 to +15. Positive for success, negative for failure. 0 for partial.'
            },
            assessment: {
              type: 'string',
              description: "Washington's full assessment in 18th-century formal voice. 2-4 paragraphs. Be specific about what the agent did right or wrong. Reference historical tradecraft."
            },
            strategicNote: {
              type: 'string',
              description: 'One sentence: the key operational lesson from this mission.'
            }
          }
        }
      }],
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    });

    let toolInputBuffer = '';
    let inToolUse = false;

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block?.type === 'tool_use') inToolUse = true;
      } else if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'input_json_delta' && inToolUse) {
          toolInputBuffer += d.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (inToolUse && toolInputBuffer) {
          try {
            const judgment = JSON.parse(toolInputBuffer);
            res.write(`data: ${JSON.stringify({ type: 'judgment', ...judgment })}\n\n`);
          } catch (parseErr) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to parse judgment: ' + parseErr.message })}\n\n`);
          }
          inToolUse = false;
          toolInputBuffer = '';
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Judge error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}

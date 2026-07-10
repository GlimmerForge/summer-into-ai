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
  const { topic, debate = [] } = body;

  const transcript = debate.map(d => `
=== ${d.name} (voted ${d.vote}) ===
OPENING ARGUMENT:
${(d.argument || '').slice(0, 1500)}

REBUTTAL:
${(d.rebuttal || '(none delivered)').slice(0, 1000)}`).join('\n');

  const systemPrompt = `You are Chief Justice John Marshall, presiding over a debate among five Founding Fathers on a modern constitutional question. It is your duty to evaluate the quality of argumentation — not to vote on the question itself, but to judge who argued best.

Evaluation criteria:
- Fidelity to the founder's own documented principles
- Direct engagement with opposing arguments (a rebuttal that names and dismantles a specific claim beats a restated position)
- Constitutional reasoning quality
- Rhetorical force

Be a rigorous judge. The strongest advocate is not always on the winning side of the vote.`;

  const userMessage = `The question before the court: ${topic}

Full debate transcript:
${transcript}

Deliver your opinion on who argued best.`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 6000 },
      system: systemPrompt,
      tools: [{
        name: 'deliver_opinion',
        description: "Chief Justice Marshall's formal opinion on the debate",
        input_schema: {
          type: 'object',
          required: ['winner', 'winnerName', 'winnerReason', 'opinion'],
          properties: {
            winner: {
              type: 'string',
              enum: ['washington', 'franklin', 'hamilton', 'madison', 'jefferson'],
              description: 'ID of the founder whose combined argument and rebuttal was most persuasive'
            },
            winnerName: {
              type: 'string',
              description: "The winning founder's full name"
            },
            winnerReason: {
              type: 'string',
              description: 'One sentence: why this founder won on argumentation quality'
            },
            opinion: {
              type: 'string',
              description: "Marshall's judicial opinion, 2-3 paragraphs in early-1800s formal judicial voice. Must reference at least two founders' specific claims by name — praise the sharpest rebuttal, note the weakest argument."
            }
          }
        }
      }],
      tool_choice: { type: 'tool', name: 'deliver_opinion' },
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
            const opinion = JSON.parse(toolInputBuffer);
            res.write(`data: ${JSON.stringify({ type: 'opinion', ...opinion })}\n\n`);
          } catch (parseErr) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to parse opinion: ' + parseErr.message })}\n\n`);
          }
          inToolUse = false;
          toolInputBuffer = '';
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Verdict error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
